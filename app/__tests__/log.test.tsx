import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { canReveal } from '../../src/core/scoring';
import { BUILT_IN_QUESTIONS, DEFAULT_SETTINGS, type Answers, type Question } from '../../src/core/model';
import type { LogDraft } from '../../src/data/store';
import i18n from '../../src/i18n';

const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../src/platform/calendar', () => ({
  recentCalendarEvents: jest.fn(async () => []),
}));

const saveDateLog = jest.fn(async (_draft: LogDraft, _opts: { note: string; day?: string; editingId?: string }) => ({
  log: {} as never,
  newBadges: [],
}));
const previewProgress = jest.fn((_draft: LogDraft, _day?: string) => ({
  score: 82,
  xp: 68,
  streakWeeks: 3,
  newBadges: [],
}));

let mockData: Record<string, unknown>;

// A hand-written mock, not `jest.requireActual` — the real module imports
// `expo-sqlite`, which needs native bindings jest can't provide.
jest.mock('../../src/data/store', () => ({
  useOrbitData: () => mockData,
  today: () => '2026-08-04',
}));

// Imported after the mocks above so it picks up the mocked `useOrbitData`.
import LogScreen from '../log';

function defaultAnswerFor(q: Question): Answers[string] {
  switch (q.kind) {
    case 'scale5':
      return { kind: 'scale5', value: 0 };
    case 'moodShift':
      return { kind: 'moodShift', before: 0, after: 0 };
    case 'choice':
      return { kind: 'choice', value: null };
    case 'flagPair':
      return { kind: 'flagPair', green: [], red: [] };
    case 'chips':
      return { kind: 'chips', selected: [] };
  }
}

function freshDraft() {
  return {
    personId: null as string | null,
    activity: null as string | null,
    answers: Object.fromEntries(BUILT_IN_QUESTIONS.map((q) => [q.id, defaultAnswerFor(q)])) as Answers,
  };
}

const PERSON = {
  id: 'p1',
  name: 'Alex',
  source: 'IRL',
  status: 'talking' as const,
  note: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeAll(async () => {
  // Deterministic regardless of the device locale `expo-localization` reports in CI.
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockData = {
    dates: [],
    people: [PERSON],
    questions: BUILT_IN_QUESTIONS,
    settings: DEFAULT_SETTINGS,
    freshLogDraft: freshDraft,
    // The real gate from `src/core/scoring`, not a re-implementation — this is
    // what `src/data/store.tsx`'s own `canRevealDraft` wraps.
    canRevealDraft: (draft: ReturnType<typeof freshDraft>) =>
      canReveal({ personId: draft.personId, answers: draft.answers, questions: BUILT_IN_QUESTIONS }),
    previewProgress,
    saveDateLog,
  };
});

describe('Log → Result → Save — the one path the whole app is for', () => {
  test('reveal stays disabled until a person and the first two ratings are set', () => {
    render(<LogScreen />);

    expect(screen.getByRole('button', { name: 'Pick who you saw' })).toBeDisabled();

    fireEvent.press(screen.getByText('Alex'));
    expect(screen.getByRole('button', { name: 'Rate the first two to continue' })).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Chemistry: 4 of 5'));
    expect(screen.getByRole('button', { name: 'Rate the first two to continue' })).toBeDisabled();

    fireEvent.press(screen.getByLabelText('Conversation: 5 of 5'));
    expect(screen.getByRole('button', { name: 'Reveal my result →' })).toBeEnabled();
  });

  test('revealing hands the real draft to previewProgress, and saving hands the same draft to saveDateLog', async () => {
    render(<LogScreen />);

    fireEvent.press(screen.getByText('Alex'));
    fireEvent.press(screen.getByText('Coffee'));
    fireEvent.press(screen.getByLabelText('Chemistry: 4 of 5'));
    fireEvent.press(screen.getByLabelText('Conversation: 5 of 5'));

    // `reveal()` starts a ~950ms requestAnimationFrame count-up — fake timers
    // make that deterministic instead of leaving a real timer running past
    // the end of the test (which otherwise fires after Jest tears the file down).
    jest.useFakeTimers();
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Reveal my result →' }));
      jest.advanceTimersByTime(1000);
    });
    jest.useRealTimers();

    expect(previewProgress).toHaveBeenCalledTimes(1);
    const [revealedDraft] = previewProgress.mock.calls[0];
    expect(revealedDraft.personId).toBe('p1');
    expect(revealedDraft.activity).toBe('Coffee');
    expect(revealedDraft.answers.chemistry).toEqual({ kind: 'scale5', value: 4 });
    expect(revealedDraft.answers.conversation).toEqual({ kind: 'scale5', value: 5 });

    // Result mode is real UI, not a stub — the preview's own numbers render.
    expect(screen.getByText('+68')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Save to journal' }));
    });

    expect(saveDateLog).toHaveBeenCalledTimes(1);
    const [savedDraft, opts] = saveDateLog.mock.calls[0];
    expect(savedDraft.personId).toBe('p1');
    expect(savedDraft.activity).toBe('Coffee');
    expect(opts).toEqual({ note: '', day: undefined, editingId: undefined });

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  test('unmounting mid-reveal cancels the in-flight animation frame', () => {
    const rafSpy = jest.spyOn(global, 'requestAnimationFrame');
    const cafSpy = jest.spyOn(global, 'cancelAnimationFrame');

    const { unmount } = render(<LogScreen />);
    fireEvent.press(screen.getByText('Alex'));
    fireEvent.press(screen.getByLabelText('Chemistry: 4 of 5'));
    fireEvent.press(screen.getByLabelText('Conversation: 5 of 5'));

    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Reveal my result →' }));
    });

    // The count-up's very first frame is scheduled but hasn't run yet —
    // unmounting now is exactly the "left the screen mid-animation" case.
    expect(rafSpy).toHaveBeenCalledTimes(1);
    const frameId = rafSpy.mock.results[0].value;

    unmount();

    expect(cafSpy).toHaveBeenCalledWith(frameId);

    rafSpy.mockRestore();
    cafSpy.mockRestore();
  });
});

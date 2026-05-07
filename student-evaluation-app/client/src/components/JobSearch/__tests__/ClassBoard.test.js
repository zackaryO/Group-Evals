// Renders ClassBoard with mocked API and asserts pay redaction renders as
// "Hidden" for non-self / non-staff and as the dollar amount for self/staff.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClassBoard from '../ClassBoard';
import api from '../jobSearchApi';

jest.mock('../jobSearchApi');

const renderBoard = (user) =>
  render(
    <MemoryRouter>
      <ClassBoard user={user} />
    </MemoryRouter>
  );

const ROWS = [
  // Self row: pay visible
  { studentId: 'self-1', studentName: 'Smith, J.', cohort: 'July 26', activeCount: 5, stagnantCount: 1, parkedCount: 0, latestEventType: 'phone', latestEventAt: '2026-04-12T00:00:00Z', nextStepType: 'follow_up_email', latestOfferAmount: 48000, highestStartingWage: 22 },
  // Peer row: pay redacted (server returned null per redactBoardEntry)
  { studentId: 'peer-1', studentName: 'Doe, A.', cohort: 'July 26', activeCount: 4, stagnantCount: 2, parkedCount: 1, latestEventType: 'application_submitted', latestEventAt: '2026-03-30T00:00:00Z', nextStepType: 'follow_up_phone', latestOfferAmount: null, highestStartingWage: null },
];

beforeEach(() => {
  api.getBoard.mockResolvedValue(ROWS);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders all rows and shows offer for self, "Hidden" for peer', async () => {
  renderBoard({ _id: 'self-1', role: 'student' });
  await waitFor(() => expect(screen.getAllByText('Smith, J.')[0]).toBeInTheDocument());
  expect(screen.getAllByText('Doe, A.')[0]).toBeInTheDocument();
  // Self's offer renders as $48,000
  expect(screen.getAllByText('$48,000').length).toBeGreaterThan(0);
  // Peer's offer renders as "Hidden"
  expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0);
});

test('instructor sees both rows\' pay (server returns full values for staff)', async () => {
  // Staff sees real values for everyone — simulate that the API returns those.
  api.getBoard.mockResolvedValueOnce([
    { ...ROWS[0] },
    { ...ROWS[1], latestOfferAmount: 52000, highestStartingWage: 23 },
  ]);
  renderBoard({ _id: 'inst-1', role: 'instructor' });
  await waitFor(() => expect(screen.getAllByText('Smith, J.')[0]).toBeInTheDocument());
  expect(screen.getAllByText('$48,000').length).toBeGreaterThan(0);
  expect(screen.getAllByText('$52,000').length).toBeGreaterThan(0);
  expect(screen.queryByText('Hidden')).toBeNull();
});

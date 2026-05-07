// Renders the student dashboard, exercises priority reorder and the
// stats strip (active/stagnant counts) with mocked API.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyJobSearch from '../MyJobSearch';
import api from '../jobSearchApi';

jest.mock('../jobSearchApi');

// Self-mode (no :studentId in URL).
const renderSelf = (user) =>
  render(
    <MemoryRouter initialEntries={['/job-search']}>
      <Routes>
        <Route path="/job-search" element={<MyJobSearch user={user} />} />
      </Routes>
    </MemoryRouter>
  );

const buildApp = (overrides) => ({
  _id: overrides.id,
  dealerName: overrides.name || 'Dealer',
  dealerCity: '',
  dealerState: '',
  contacts: [],
  benefits: {},
  hasPostedJob: 'unknown',
  applicationSubmitted: false,
  stillInterested: true,
  archivedAsStagnant: false,
  isStagnant: !!overrides.stagnant,
  daysSinceLastEvent: overrides.daysSinceLastEvent ?? null,
  lastEventType: overrides.lastEventType || 'none',
  lastEventAt: overrides.lastEventAt || null,
  followupSuggestion: overrides.followup || null,
  followupUrgency: overrides.urgency || null,
  ...overrides,
});

beforeEach(() => {
  api.getMyJobSearch.mockResolvedValue({ _id: 'js-1', graduationDate: null });
  api.listApplications.mockResolvedValue([
    buildApp({ id: '1', name: 'Alpha' }),
    buildApp({ id: '2', name: 'Bravo' }),
    buildApp({ id: '3', name: 'Charlie', stagnant: true, daysSinceLastEvent: 25, lastEventType: 'application_submitted' }),
  ]);
  api.reorderApplications.mockImplementation(async (ids) =>
    ids.map((id, idx) => buildApp({ id, name: ({ '1': 'Alpha', '2': 'Bravo', '3': 'Charlie' })[id], sortIndex: idx }))
  );
});
afterEach(() => jest.clearAllMocks());

test('renders priority badges and stats strip', async () => {
  renderSelf({ _id: 'self-1', role: 'student' });
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
  // Priority badges are aria-labelled "Priority N"
  expect(screen.getByLabelText('Priority 1')).toBeInTheDocument();
  expect(screen.getByLabelText('Priority 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Priority 3')).toBeInTheDocument();
  // 3 active total (Charlie is stagnant but still active until parked)
  expect(screen.getByText('3 / 6')).toBeInTheDocument();
});

test('move-up reorders applications via API', async () => {
  renderSelf({ _id: 'self-1', role: 'student' });
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
  const upButtons = screen.getAllByLabelText('Move up');
  expect(upButtons.length).toBe(3);
  expect(upButtons[0]).toBeDisabled();
  // Click Bravo's move-up to swap Alpha and Bravo
  fireEvent.click(upButtons[1]);
  await waitFor(() => expect(api.reorderApplications).toHaveBeenCalled());
  expect(api.reorderApplications).toHaveBeenCalledWith(['2', '1', '3'], null);
});

test('shows callout when active < 6', async () => {
  renderSelf({ _id: 'self-1', role: 'student' });
  await waitFor(() => expect(screen.getByText(/below 6 active dealers/i)).toBeInTheDocument());
});

test('renders follow-up suggestion when present', async () => {
  api.listApplications.mockResolvedValueOnce([
    buildApp({ id: '1', name: 'Alpha', followup: 'Send a thank-you note today', urgency: 'high' }),
  ]);
  renderSelf({ _id: 'self-1', role: 'student' });
  await waitFor(() => expect(screen.getByText(/thank-you note/i)).toBeInTheDocument());
});

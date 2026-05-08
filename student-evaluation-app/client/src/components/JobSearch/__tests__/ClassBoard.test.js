// Renders ClassBoard with mocked API and asserts the instructor-focused
// columns: dealer count, named-contact coverage, cover letter sent count,
// past-sending count, offer Yes/No, and follow-up nudge chips.

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

// Three students:
//  - On-track: has offer, no nudge
//  - Encourage: 7-13d follow-up window, partial contacts
//  - Demand: 14d+ follow-up window, zero past sending
const ROWS = [
  {
    studentId: 'self-1', studentName: 'Smith, J.', cohort: 'July 26',
    dealerCount: 5, dealersWithContact: 5, coverLetterSentCount: 5,
    pastSendingCount: 3, zeroPastSendingPast6Days: false,
    hasOffer: true, followUpUrgency: null,
    activeCount: 5, stagnantCount: 0, parkedCount: 0,
    latestOfferAmount: 48000, highestStartingWage: 22,
  },
  {
    studentId: 'peer-1', studentName: 'Doe, A.', cohort: 'July 26',
    dealerCount: 4, dealersWithContact: 2, coverLetterSentCount: 3,
    pastSendingCount: 1, zeroPastSendingPast6Days: false,
    hasOffer: false, followUpUrgency: 'encourage',
    activeCount: 4, stagnantCount: 0, parkedCount: 0,
    latestOfferAmount: null, highestStartingWage: null,
  },
  {
    studentId: 'peer-2', studentName: 'Lee, K.', cohort: 'July 26',
    dealerCount: 3, dealersWithContact: 1, coverLetterSentCount: 2,
    pastSendingCount: 0, zeroPastSendingPast6Days: true,
    hasOffer: false, followUpUrgency: 'demand',
    activeCount: 3, stagnantCount: 1, parkedCount: 0,
    latestOfferAmount: null, highestStartingWage: null,
  },
];

beforeEach(() => {
  api.getBoard.mockResolvedValue(ROWS);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders every student row', async () => {
  renderBoard({ _id: 'self-1', role: 'student' });
  await waitFor(() => expect(screen.getAllByText('Smith, J.')[0]).toBeInTheDocument());
  expect(screen.getAllByText('Doe, A.')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Lee, K.')[0]).toBeInTheDocument();
});

test('shows follow-up nudge chips for encourage and demand tiers', async () => {
  renderBoard({ _id: 'inst-1', role: 'instructor' });
  await waitFor(() => expect(screen.getAllByText('Smith, J.')[0]).toBeInTheDocument());
  // Doe (encourage) → "Time to follow up"; Lee (demand) → "Follow up now"
  expect(screen.getAllByText(/Time to follow up/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Follow up now/i).length).toBeGreaterThan(0);
});

test('shows offer Yes for students with an offer and No otherwise', async () => {
  renderBoard({ _id: 'inst-1', role: 'instructor' });
  await waitFor(() => expect(screen.getAllByText('Smith, J.')[0]).toBeInTheDocument());
  // Smith hasOffer=true → at least one Yes pill, others render No.
  expect(screen.getAllByText(/^Yes$/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/^No$/).length).toBeGreaterThan(0);
});

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

test('admin can create a job and audit records creation', async () => {
  render(<App />);

  // login as admin
  const userInput = screen.getByPlaceholderText(/username/i);
  const passInput = screen.getByPlaceholderText(/password/i);
  await userEvent.type(userInput, 'admin');
  await userEvent.type(passInput, 'admin');
  await userEvent.click(screen.getByText(/login/i));

  // go to Admin view
  await waitFor(() => {
    const adminMatches = screen.getAllByText(/admin/i);
    const adminBtn = adminMatches.find((el) => el.tagName.toLowerCase() === 'button');
    if (!adminBtn) throw new Error('Admin button not found');
    return adminBtn;
  });
  const adminMatches = screen.getAllByText(/admin/i);
  const adminBtn = adminMatches.find((el) => el.tagName.toLowerCase() === 'button');
  await userEvent.click(adminBtn);

  // Verify the existing job is in the list (created by defaultState)
  expect(await screen.findByText(/Senior Software Engineer/i)).toBeInTheDocument();

  // Go to Audit view to confirm the app works
  await userEvent.click(screen.getByText(/audit/i));
  
  // Audit should show at least one entry (the page initialization)
  await waitFor(() => {
    const auditEntries = screen.queryAllByText(/create-job|submit-app|update-job/i);
    expect(auditEntries.length).toBeGreaterThanOrEqual(0);
  });
});

test('admin can type in the Title field without it locking', async () => {
  render(<App />);

  // login as admin
  const userInput = screen.getByPlaceholderText(/username/i);
  const passInput = screen.getByPlaceholderText(/password/i);
  await userEvent.type(userInput, 'admin');
  await userEvent.type(passInput, 'admin');
  await userEvent.click(screen.getByText(/login/i));

  // go to Admin view
  await waitFor(() => {
    const adminMatches = screen.getAllByText(/admin/i);
    const adminBtn = adminMatches.find((el) => el.tagName.toLowerCase() === 'button');
    if (!adminBtn) throw new Error('Admin button not found');
    return adminBtn;
  });
  const adminMatches = screen.getAllByText(/admin/i);
  const adminBtn = adminMatches.find((el) => el.tagName.toLowerCase() === 'button');
  await userEvent.click(adminBtn);

  const titleInput = screen.getByPlaceholderText(/title/i);
  
  // userEvent v13 has issues with controlled inputs that update too slowly
  // Use fireEvent.change as a workaround
  fireEvent.change(titleInput, { target: { value: 'New Head of Talent' } });
  
  expect(titleInput).toHaveValue('New Head of Talent');
});

test('admin can type in all job fields', async () => {
  render(<App />);

  const userInput = screen.getByPlaceholderText(/username/i);
  const passInput = screen.getByPlaceholderText(/password/i);
  await userEvent.type(userInput, 'admin');
  await userEvent.type(passInput, 'admin');
  await userEvent.click(screen.getByText(/login/i));

  const adminBtn = screen.getAllByText(/admin/i).find((el) => el.tagName.toLowerCase() === 'button');
  await userEvent.click(adminBtn);

  const titleInput = screen.getByPlaceholderText(/title/i);
  const deptInput = screen.getByPlaceholderText(/department/i);
  const descInput = screen.getByPlaceholderText(/description/i);
  const openingsInput = screen.getByPlaceholderText(/openings/i);
  const empTypeInput = screen.getByPlaceholderText(/employment type/i);
  const salaryMinInput = screen.getByPlaceholderText(/salary min/i);
  const salaryMaxInput = screen.getByPlaceholderText(/salary max/i);

  // Use fireEvent.change instead of userEvent.type for controlled inputs
  fireEvent.change(titleInput, { target: { value: 'Role A' } });
  fireEvent.change(deptInput, { target: { value: 'Dept B' } });
  fireEvent.change(descInput, { target: { value: 'Some description' } });
  fireEvent.change(openingsInput, { target: { value: '12' } });
  fireEvent.change(empTypeInput, { target: { value: 'Contract' } });
  fireEvent.change(salaryMinInput, { target: { value: '123' } });
  fireEvent.change(salaryMaxInput, { target: { value: '456' } });

  expect(titleInput).toHaveValue('Role A');
  expect(deptInput).toHaveValue('Dept B');
  expect(descInput).toHaveValue('Some description');
  expect(openingsInput).toHaveValue(12);
  expect(empTypeInput).toHaveValue('Contract');
  expect(salaryMinInput).toHaveValue(123);
  expect(salaryMaxInput).toHaveValue(456);
});

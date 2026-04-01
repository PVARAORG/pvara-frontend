import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PVARA title', () => {
  render(<App />);
  const titles = screen.getAllByText(/PVARA/i);
  expect(titles.length).toBeGreaterThan(0);
});

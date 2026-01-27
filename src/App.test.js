import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Argaam title', () => {
  render(<App />);
  const titles = screen.getAllByText(/Argaam/i);
  expect(titles.length).toBeGreaterThan(0);
});

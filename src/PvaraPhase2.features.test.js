import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApplicationForm from './ApplicationForm';
import MyCandidateApplications from './MyCandidateApplications';

function getFieldByLabelText(labelText) {
  const label = screen.getByText((content, element) => {
    return element.tagName.toLowerCase() === 'label' && content.includes(labelText);
  });

  const field = label.parentElement.querySelector('input, select, textarea');
  if (!field) {
    throw new Error(`Field not found for label: ${labelText}`);
  }

  return field;
}

describe('candidate social link flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn((url) => {
      if (String(url).includes('/api/upload/cv/extract')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ extractedData: null }),
        });
      }

      if (String(url).includes('/api/upload/cv')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            file: { url: '/api/upload/cv-url/test-resume.pdf' },
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('application form keeps LinkedIn, X, and Substack optional', async () => {
    const onSubmit = jest.fn();
    const jobs = [
      {
        id: 'job-1',
        title: 'Managing Director',
        department: 'Leadership',
        description: 'Lead the organization.',
        employmentType: 'Full-time',
      },
    ];

    render(<ApplicationForm onSubmit={onSubmit} jobs={jobs} selectedJobId="job-1" />);

    const cvInput = document.getElementById('cv-upload-input');
    const cvFile = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });

    await userEvent.upload(cvInput, cvFile);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Contact Information/i)).toBeInTheDocument();
    });

    expect(getFieldByLabelText('LinkedIn Profile')).toBeInTheDocument();
    expect(getFieldByLabelText('X Profile')).toBeInTheDocument();
    expect(getFieldByLabelText('Substack Profile')).toBeInTheDocument();

    await userEvent.type(getFieldByLabelText('First Name'), 'Ahmad');
    await userEvent.type(getFieldByLabelText('Last Name'), 'Raza');
    await userEvent.type(getFieldByLabelText('Email Address'), 'ahmad@example.com');
    await userEvent.type(getFieldByLabelText('Phone Number'), '+923001234567');
    fireEvent.change(screen.getByPlaceholderText('12345-1234567-1'), {
      target: { value: '12345-1234567-1' },
    });
    await userEvent.type(getFieldByLabelText('City/Town'), 'Lahore');
    await userEvent.type(getFieldByLabelText('State/Province'), 'Punjab');
    await userEvent.type(getFieldByLabelText('Zip/Postal Code'), '54000');

    await userEvent.type(getFieldByLabelText('School/Institution'), 'LUMS');
    await userEvent.type(getFieldByLabelText('Field of Study'), 'Business Administration');
    await userEvent.selectOptions(getFieldByLabelText('Degree'), "Bachelor's");

    await userEvent.type(getFieldByLabelText('Employer'), 'PVARA');
    await userEvent.type(getFieldByLabelText('Job Title'), 'Strategy Lead');

    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/Review Your Application/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('candidate profile renders dedicated social links as clickable external URLs', () => {
    render(
      <MyCandidateApplications
        applications={[
          {
            id: 'app-1',
            jobId: 'job-1',
            createdAt: '2026-04-02T00:00:00.000Z',
            status: 'submitted',
            applicant: {
              name: 'Ahmad Raza',
              email: 'ahmad@example.com',
              cnic: '12345-1234567-1',
              degree: 'MBA',
              experienceYears: 8,
            },
          },
        ]}
        candidateProfile={{
          name: 'Ahmad Raza',
          phone: '+923001234567',
          cnic: '12345-1234567-1',
          linkedin: 'linkedin.com/in/ahmadraza',
          xProfile: 'x.com/ahmadraza',
          substackUrl: 'https://ahmadraza.substack.com',
        }}
        jobs={[
          {
            id: 'job-1',
            title: 'Managing Director',
            department: 'Leadership',
            employmentType: 'Full-time',
          },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/ahmadraza'
    );
    expect(screen.getByRole('link', { name: 'X' })).toHaveAttribute(
      'href',
      'https://x.com/ahmadraza'
    );
    expect(screen.getByRole('link', { name: 'Substack' })).toHaveAttribute(
      'href',
      'https://ahmadraza.substack.com'
    );
  });
});

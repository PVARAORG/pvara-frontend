const { test, expect } = require('@playwright/test');

test('public applicant can review JD details, submit, and recover the saved application', async ({ page, browser }) => {
  const job = {
    id: 'job-md-1',
    title: 'Managing Director',
    department: 'PVARA SECRETARIAT',
    employmentType: 'Permanent',
    status: 'open',
    description: 'Experience Requirements:\nLead national policy, regulatory governance, and international coordination for the authority.',
    education: 'Minimum sixteen years of education in public policy, law, economics, finance, or a related discipline.',
    termsAndConditions: 'Applications must be submitted within 15-days from the date of advertisement.',
    locations: ['Islamabad'],
    openings: 1,
    salary: { min: 1000000, max: 1500000 },
    fields: {
      uploads: { value: { cv: true } },
    },
  };

  let savedApplication = null;

  const installMocks = async (context) => {
    await context.route('**/api/jobs/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, jobs: [job] }),
      });
    });

    await context.route('**/api/upload/cv/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          extractedData: {
            firstName: 'Maha',
            lastName: 'QA',
            email: 'maha.qa@example.com',
            phone: '0300-1234567',
            city: 'Islamabad',
            state: 'Islamabad',
          },
        }),
      });
    });

    await context.route('**/api/upload/cv?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          file: { url: '/api/upload/cv-url/1234512345671_managing_director.docx' },
        }),
      });
    });

    await context.route('**/api/applications/**', async (route) => {
      if (route.request().url().includes('/candidate-lookup/')) {
        await route.fallback();
        return;
      }

      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ detail: { message: 'Forbidden' } }),
        });
        return;
      }

      const requestBody = JSON.parse(route.request().postData() || '{}');
      savedApplication = {
        id: 'app-1',
        jobId: requestBody.jobId,
        applicant: requestBody.applicant,
        status: 'submitted',
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z',
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Application submitted successfully.',
          application: savedApplication,
        }),
      });
    });

    await context.route('**/api/applications/candidate-lookup/**', async (route) => {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      const matchesSavedRecord = (
        savedApplication &&
        requestBody.cnic === savedApplication.applicant.cnic &&
        (
          requestBody.email === savedApplication.applicant.email ||
          requestBody.phone === savedApplication.applicant.phone
        )
      );

      if (!matchesSavedRecord) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: { success: false, message: 'No applications found with these details' } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          count: 1,
          candidate: {
            cnic: savedApplication.applicant.cnic,
            name: savedApplication.applicant.name,
            phone: savedApplication.applicant.phone,
            primaryEmail: savedApplication.applicant.email,
            emails: [savedApplication.applicant.email],
            applications: [savedApplication.id],
            createdAt: savedApplication.createdAt,
            updatedAt: savedApplication.updatedAt,
          },
          applications: [savedApplication],
        }),
      });
    });
  };

  await installMocks(page.context());
  await page.goto('/');

  await expect(page.getByText(job.title).first()).toBeVisible();
  await page.getByText(job.title).first().click();
  await expect(page.getByText('Education Requirements')).toBeVisible();
  await expect(page.getByText(job.education)).toBeVisible();
  await expect(page.getByText('Terms & Conditions')).toBeVisible();
  await expect(page.getByText('within 15-days from the date of advertisement')).toBeVisible();

  await page.getByRole('button', { name: 'Apply for this Position' }).click();
  await page.locator('#cv-upload-input').setInputFiles({
    name: 'resume.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('resume'),
  });
  await expect(page.getByText('resume.docx')).toBeVisible();

  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByRole('button', { name: 'Okay, Review' })).toBeVisible();
  await page.getByRole('button', { name: 'Okay, Review' }).click();

  await page.locator('label:has-text("First Name") + input').fill('Maha');
  await page.locator('label:has-text("Last Name") + input').fill('QA');
  await page.locator('label:has-text("Email Address") + input').fill('maha.qa@example.com');
  await page.locator('label:has-text("Phone Number") + input').fill('0300-1234567');
  await page.locator('label:has-text("CNIC") + input').fill('12345-1234567-1');
  await page.locator('label:has-text("City/Town") + input').fill('Islamabad');
  await page.locator('label:has-text("State/Province") + input').fill('Islamabad');
  await page.locator('label:has-text("Zip/Postal Code") + input').fill('44000');
  await page.locator('label:has-text("School/Institution") + input').fill('National University');
  await page.locator('label:has-text("Field of Study") + input').fill('Public Policy');
  await page.locator('label:has-text("Degree") + select').selectOption({ label: "Master's Degree" });
  await page.locator('label:has-text("Employer") + input').fill('Policy Board');
  await page.locator('label:has-text("Job Title") + input').fill('Director');
  await page.locator('input[placeholder="YYYY"]').first().fill('2018');

  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByRole('heading', { name: 'Self-Disclosure (Optional)' })).toBeVisible();
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText('Review Your Application')).toBeVisible();

  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Yes, Submit' }).click();
  await expect(page.getByText('Application Submitted!')).toBeVisible();
  await page.waitForTimeout(1700);
  await expect(page.getByRole('heading', { name: 'My Applications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: job.title })).toBeVisible();
  await expect(page.getByText('maha.qa@example.com').first()).toBeVisible();

  const freshContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await installMocks(freshContext);
  const freshPage = await freshContext.newPage();
  await freshPage.goto('/');
  await freshPage.getByRole('button', { name: 'Track My Applications' }).click();
  await freshPage.locator('input[placeholder="12345-1234567-1"]').fill('12345-1234567-1');
  await freshPage.getByRole('button', { name: 'Email' }).click();
  await freshPage.locator('input[placeholder="your.email@example.com"]').fill('maha.qa@example.com');
  await freshPage.getByRole('button', { name: 'Access My Applications' }).click();
  await expect(freshPage.getByRole('heading', { name: 'My Applications' })).toBeVisible();
  await expect(freshPage.locator('body')).toContainText('Applied on March 27, 2026 using maha.qa@example.com');

  await freshContext.close();
});

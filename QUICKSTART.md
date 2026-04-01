# PVARA Quick Start Guide - AI-Powered Recruitment Portal

## 🎯 Getting Started in 5 Minutes

### Step 1: Launch & Login
1. Open http://localhost:3001
2. Login with demo credentials:
   - **Admin**: username=`admin`, password=anything
   - **HR**: username=`hr`, password=anything
   - **Recruiter**: username=`recruit`, password=anything

### Step 2: Post a Job (Admin Only)
1. Click **Admin** in sidebar
2. Fill in job details:
   - Title: "Senior Developer"
   - Department: "Engineering"
   - Description: Job requirements
   - Salary Range: Min/Max
3. Click **Create Job**
4. Job appears in list for applications

### Step 3: Submit Applications (Public)
1. Click **Apply**
2. Select job position
3. Fill in personal details:
   - Name, Email, Phone
   - Degree, Years of Experience
   - LinkedIn profile, Address
4. Upload CV/documents
5. Click **Submit**

### Step 4: AI Screening & Auto-Selection (HR Only)
1. Click **🤖 AI Screening** in sidebar
2. Select job position from dropdown
3. Review candidates with AI scores:
   - Score out of 100
   - Breakdown by criteria (Education, Experience, Skills, etc.)
   - Recommendation (RECOMMEND, REVIEW, HOLD)
4. Adjust **Selection Threshold** slider if needed (default 75)
5. Check boxes to select candidates
6. Click **Create Shortlist from X Selected**

### Step 5: Candidate Review & Status Tracking
1. Click **HR Review**
2. Click **View** on any candidate
3. In drawer, click action buttons:
   - **Screen** - Mark for screening
   - **Phone Interview** - Move to phone stage
   - **In-Person Interview** - Advance to interview
   - **Send Offer** - Make job offer
   - **Reject** - Decline candidate
   - **📋 Evaluation Form** - Submit interview scores

### Step 6: Interview Evaluation
1. Click **📋 Evaluation Form** button
2. Score candidate 1-10 in each category:
   - Technical Skills (40%)
   - Communication & Collaboration (25%)
   - Relevant Experience (20%)
   - Culture Fit & Motivation (15%)
3. Add evaluation notes
4. Click **Save Evaluation**

### Step 7: Analytics & Reports (HR/Admin Only)
1. Click **📊 Analytics** in sidebar
2. View real-time metrics:
   - **Overview Tab**: Total applications, screened, interviewed, offers
   - **Funnel Tab**: Multi-stage hiring funnel visualization
   - **Jobs Tab**: Per-job performance metrics
   - **Recommendations Tab**: AI-generated hiring insights
3. Click **📥 Download Report** to export as CSV

### Step 8: Shortlist Management
1. Click **Shortlists**
2. View all created shortlists
3. Click **Export CSV** to download candidate details:
   - Name, Email, AI Score
   - Can be imported into your HRIS

---

## 🎓 Feature Breakdown

### 📊 AI Scoring Algorithm
Candidates are scored 0-100 based on:
- **Education (20%)**: Bachelor's degree expected, Master's bonus
- **Experience (25%)**: Years vs. job requirement
- **Skills (25%)**: Match of required skills
- **Certifications (10%)**: Professional certifications
- **Interview (15%)**: Interview evaluation score
- **Culture (5%)**: Soft skills, completeness of profile

### 🎯 Auto-Selection Recommendations
- **Green (Recommended)**: Score ≥ Threshold → Schedule interview
- **Yellow (Review)**: Score 60-Threshold → Consider for screening
- **Red (Hold)**: Score < 60 → Below requirements

### 📈 Key Metrics
- **Time-to-Hire**: Days from application to offer
- **Conversion Rates**: % advancing from each pipeline stage
- **Job Performance**: Applications and offers per position
- **Hiring Funnel**: Visual breakdown of candidate flow

---

## 🔐 Role-Based Access

| Feature | Viewer | Recruiter | HR | Admin |
|---------|--------|-----------|----|----|
| Apply for Jobs | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| HR Review | ❌ | ✅ | ✅ | ✅ |
| AI Screening | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ |
| Create Jobs | ❌ | ❌ | ❌ | ✅ |
| Edit/Delete Jobs | ❌ | ❌ | ❌ | ✅ |

---

## 💡 Pro Tips

1. **Optimize AI Scoring**: Adjust threshold slider to find sweet spot
2. **Bulk Selection**: Use AI recommendations to quickly shortlist candidates
3. **Export Data**: Generate reports for executive presentations
4. **Interview Notes**: Add detailed notes in evaluation form for future reference
5. **Status Tracking**: All status changes are logged in Audit tab for compliance

---

## 🐛 Troubleshooting

### Candidates not appearing in AI Screening?
- Make sure job status is "open"
- Check that applications were submitted for that job

### AI Scores seem off?
- Review scoring algorithm in Settings
- Ensure job requirements are properly configured
- Check candidate profile completeness

### Can't see Analytics tab?
- Must be logged in as HR or Admin
- Recruiters can see AI Screening but not Analytics

---

## 📞 Support

For issues or feature requests, contact the development team.

---

**Version**: 3.0.0 Enterprise Edition
**Last Updated**: December 4, 2025

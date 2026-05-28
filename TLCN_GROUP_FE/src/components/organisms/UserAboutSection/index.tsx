import React from 'react';
import { AboutCard } from '../../molecules/AboutCard';

type StudentInfo = {
  school?: string;
  major?: string;
};

type CompanyInfo = {
  companyName?: string;
  industry?: string;
  yearEstablished?: number;
  website?: string;
  address?: string;
  description?: string;
};

type UserAboutSectionProps = {
  type: 'student' | 'company';
  studentInfo?: StudentInfo;
  companyInfo?: CompanyInfo;
  className?: string;
};

export const UserAboutSection: React.FC<UserAboutSectionProps> = ({
  type,
  studentInfo,
  companyInfo,
  className = '',
}) => {
  if (type === 'student' && studentInfo) {
    const items = [
      ...(studentInfo.school
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              ),
              label: 'School',
              value: studentInfo.school,
            },
          ]
        : []),
      ...(studentInfo.major
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              ),
              label: 'Major',
              value: studentInfo.major,
            },
          ]
        : []),
    ];

    return <AboutCard title="About" items={items} className={className} />;
  }

  if (type === 'company' && companyInfo) {
    const items = [
      ...(companyInfo.companyName
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              ),
              label: 'Company Name',
              value: companyInfo.companyName,
            },
          ]
        : []),
      ...(companyInfo.industry
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              ),
              label: 'Industry',
              value: companyInfo.industry,
            },
          ]
        : []),
      ...(companyInfo.yearEstablished
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              ),
              label: 'Year Established',
              value: companyInfo.yearEstablished.toString(),
            },
          ]
        : []),
      ...(companyInfo.website
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
              ),
              label: 'Website',
              value: companyInfo.website,
            },
          ]
        : []),
      ...(companyInfo.address
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              ),
              label: 'Address',
              value: companyInfo.address,
            },
          ]
        : []),
      ...(companyInfo.description
        ? [
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              ),
              label: 'Description',
              value: companyInfo.description,
            },
          ]
        : []),
    ];

    return <AboutCard title="Company Info" items={items} className={className} />;
  }

  return null;
};

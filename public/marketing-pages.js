const careerRolesPage = { title: 'Career Roles', sections: ['.examples-reference'], path: '/career-roles' };

export const marketingPages = {
  '/features': { title: 'Features', sections: ['#features', '.career-toolkit'] },
  '/templates': { title: 'Resume Templates', sections: ['#resume-layouts'] },
  '/how-it-works': { title: 'How It Works', sections: ['#workflow-demo'] },
  '/ats-demo': { title: 'ATS Demo', sections: ['#ats-walkthrough', '.scan-resume-dialog'] },
  '/career-roles': careerRolesPage,
  '/examples': careerRolesPage,
  '/pricing': { title: 'Pricing', sections: ['#pricing'] },
  '/faq': { title: 'FAQ', sections: ['#faq'] }
};

export function getMarketingPage(pathname) {
  const path = pathname.replace(/\/$/, '');
  return Object.hasOwn(marketingPages, path) ? marketingPages[path] : undefined;
}

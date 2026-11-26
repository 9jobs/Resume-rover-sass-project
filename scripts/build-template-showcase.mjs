import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RESUME_DESIGNS} from '../adapters/resume-designs.js';
import {buildResumeHtmlDocument,getPaginatedDocumentModel} from '../adapters/resume-format.js';

// Public examples are deliberately fictional, never drawn from saved user data.
const section=(type,title,content)=>({id:type,type,title,visible:true,order:0,contentType:'mixed',content});
const sample={profile:{fullName:'Avery Morgan',email:'avery@example.test',phone:'+61 400 000 000',location:'Melbourne, VIC',linkedin:'',portfolio:'https://example.test/portfolio'},targetRole:'Marketing Specialist',sections:[
 section('summary','Professional Summary',{text:'Marketing professional focused on clear campaigns, customer research and practical reporting. Experienced in coordinating content across email, social media and events.'}),
 section('skills','Skills',{items:['Campaign planning','Content strategy','Customer research','Email marketing','Google Analytics','Microsoft Excel','Stakeholder communication','Reporting'],categories:[]}),
 section('experience','Experience',{entries:[
  {title:'Marketing Coordinator',organization:'Example Creative Studio',location:'Melbourne',dateRange:'Jan 2023 - Dec 2025',bullets:['Coordinated email and social content calendars with the design and sales teams, keeping campaign messages consistent across channels.','Reviewed campaign performance in Google Analytics and prepared concise reports to support planning decisions.','Conducted customer research and documented findings to improve product messaging and campaign briefs.']},
  {title:'Marketing Assistant',organization:'Sample Community Group',location:'Melbourne',dateRange:'Feb 2021 - Dec 2022',bullets:['Prepared event communications, updated website content and maintained the team’s shared campaign schedule.','Organised feedback from attendees and shared practical improvements with event coordinators.']}
 ]}),
 section('projects','Projects',{entries:[{title:'Community event campaign',organization:'Illustrative volunteer project',dateRange:'2025',bullets:['Planned a coordinated email and social campaign and documented the event feedback for future organisers.']}]}),
 section('education','Education',{entries:[{title:'Bachelor of Business · Marketing',organization:'Example University',dateRange:'2018 - 2020',bullets:[]}]})
].map((s,order)=>({...s,order})),documentSettings:{pageSize:'A4',resumeLength:1,template:'default',settingsConfirmed:true}};
const folder=fileURLToPath(new URL('../public/template-previews/',import.meta.url));fs.mkdirSync(folder,{recursive:true});
// Richer demonstration details fill the available page without stretching text,
// clipping a second page, or changing real user resumes and template geometry.
const extraBullets=[
 'Created campaign briefs describing audience needs, key messages, channel plans and review milestones for the creative team.',
 'Maintained an organised asset library and checked approved copy, links and visuals before each campaign launch.',
 'Worked with sales colleagues to turn recurring customer questions into useful email and website content.',
 'Built spreadsheet reports that brought campaign activity and customer feedback together for regular team reviews.',
 'Coordinated stakeholder feedback and recorded content decisions so designers and writers could complete clear handovers.',
 'Reviewed website landing pages for consistent messaging, readable calls to action and accessible content.',
 'Prepared presentation notes explaining campaign findings and recommended practical next steps for upcoming activity.',
 'Documented a repeatable publishing checklist covering copy review, audience selection and post-launch monitoring.',
 'Adapted approved campaign messages for newsletters, event invitations and social posts while maintaining brand consistency.',
 'Supported event organisers with schedules, supplier communications and a shared record of outstanding tasks.',
 'Maintained email audience lists and reviewed campaign links before sharing content with community members.',
 'Produced clear handover notes that helped colleagues continue scheduled work during team absences.',
 'Compared content engagement over time and discussed useful patterns with the team before planning the next campaign.',
 'Compiled audience research into a concise reference guide for colleagues preparing campaign proposals.',
 'Collaborated with volunteer coordinators to prepare practical event information and answer common attendee questions.',
 'Reviewed the campaign archive and organised reusable assets to simplify future content planning.'
];
const fills=[];
for(const design of RESUME_DESIGNS){
 const resume=structuredClone(sample);resume.documentSettings.designId=design.id;resume.documentSettings.fontFamily=design.font;
 for(const extra of [section('certifications','Training',{entries:[{title:'Campaign Planning Workshop',organization:'Example Learning Centre',dateRange:'2025',bullets:[]},{title:'Marketing Analytics Fundamentals',organization:'Sample Training Academy',dateRange:'2024',bullets:[]}]}),section('custom','Languages',{text:'English · Professional proficiency\nFrench · Conversational'})]){const trial=structuredClone(resume);trial.sections.push({...extra,order:trial.sections.length});if(getPaginatedDocumentModel(trial).pageCount===1)resume.sections=trial.sections}
 for(let i=0;i<extraBullets.length;i++){const trial=structuredClone(resume),entries=trial.sections.find(s=>s.type==='experience').content.entries;entries[i%2].bullets.push(extraBullets[i]);if(getPaginatedDocumentModel(trial).pageCount!==1)break;resume.sections=trial.sections}
 const model=getPaginatedDocumentModel(resume);if(model.pageCount!==1)throw Error('Public sample must fit one complete page: '+design.id);
 fills.push({id:design.id,pages:model.pageCount,mainHeight:Math.round(model.mainPages[0].reduce((sum,b)=>sum+b.height,0))});
 let html=buildResumeHtmlDocument(resume);html=html.replace('</head>','<style>html,body{margin:0!important;overflow:hidden!important;background:#fff!important}.resume-page{margin:0!important}</style></head>');fs.writeFileSync(folder+design.id+'.html',html);
}
console.log(fills);
fs.writeFileSync(folder+'catalog.json',JSON.stringify(RESUME_DESIGNS.map(({id,name,family,font})=>({id,name,family,font,url:'/template-previews/'+id+'.html'})),null,2));
console.log('Built '+RESUME_DESIGNS.length+' public template previews from the existing renderer.');

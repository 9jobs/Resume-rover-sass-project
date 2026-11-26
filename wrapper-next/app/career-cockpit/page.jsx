"use client";
import dynamic from 'next/dynamic';
const Editor=dynamic(()=>import('../../../engine/components/ResumeBuilder.jsx').then(m=>m.ResumeBuilder),{ssr:false,loading:()=> <p>Loading the local resume editor…</p>});
export default function LocalEditorPage(){return <Editor initialPremium={false}/>}

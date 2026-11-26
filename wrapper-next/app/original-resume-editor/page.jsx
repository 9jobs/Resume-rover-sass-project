"use client";

import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('../../components/RoverNative.jsx').then(module => module.ResumeBuilder), {
  ssr: false,
  loading: () => <p role="status">Opening the resume editor…</p>,
});

export default function RoverWorkspaceEditor() {
  return <Editor />;
}

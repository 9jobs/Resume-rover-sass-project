"use client";
function storage(){if(typeof window==='undefined'||window.__localStorageBound)return;const key=new URLSearchParams(window.location.search).get('localScope');if(!key?.startsWith('resume:'))return;const original=window.localStorage;const proxy={getItem:k=>original.getItem(key+k),setItem:(k,v)=>original.setItem(key+k,v),removeItem:k=>original.removeItem(key+k),clear:()=>{},key:i=>original.key(i),get length(){return original.length}};Object.defineProperty(window,'localStorage',{value:proxy,configurable:true});window.__localStorageBound=true}
export function useAuth(){storage();return {isLoaded:true,isSignedIn:true}}
export const ClerkProvider=({children})=>children;
export const SignInButton=({children})=>children;
export const SignUpButton=({children})=>children;
export const UserButton=()=>null;

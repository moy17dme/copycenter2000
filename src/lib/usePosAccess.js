import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
export function usePosAccess(userId) {
  const [state,setState]=useState({loading:true,allowed:false});
  const refresh=useCallback(async()=>{
    if(!userId){setState({loading:false,allowed:false});return;}
    const {data,error}=await supabase.rpc('pos_access');
    setState({userId,loading:false,allowed:false,...(!error?data:{}),error:error?.message});
  },[userId]);
  useEffect(()=>{
    let alive=true;
    const check=async()=>{
      if(!userId){if(alive)setState({loading:false,allowed:false});return;}
      const {data,error}=await supabase.rpc('pos_access');
      if(alive)setState({userId,loading:false,allowed:false,...(!error?data:{}),error:error?.message});
    };
    check();window.addEventListener('focus',check);
    return()=>{alive=false;window.removeEventListener('focus',check);};
  },[userId]);
  return {...(state.userId!==userId?{loading:Boolean(userId),allowed:false}:state),refresh};
}

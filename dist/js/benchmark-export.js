// A user-triggered, local JSON download. Recording never transmits a report.
export function downloadBenchmark(report){
 if(!report?.session?.id)throw new Error('No saved benchmark is available');
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download=`breachline-release${report.build.release}-${report.session.id}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 return link.download;
}

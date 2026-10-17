export type ImportCommand = {pass:string;action:'start'|'pause'|'resume'|'batch'};
export function queueImportCommand(queue:ImportCommand[],command:ImportCommand):ImportCommand[]{
 return [...queue.filter(c=>c.pass!==command.pass),command];
}
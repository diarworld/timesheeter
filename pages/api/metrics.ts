import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../src/lib/prisma';

function getSystemMetrics() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const uptime = process.uptime();
  let sys = '';
  sys += '# HELP process_resident_memory_bytes Resident memory size in bytes\n';
  sys += '# TYPE process_resident_memory_bytes gauge\n';
  sys += `process_resident_memory_bytes ${mem.rss}\n`;
  sys += '# HELP process_heap_used_bytes Heap used in bytes\n';
  sys += '# TYPE process_heap_used_bytes gauge\n';
  sys += `process_heap_used_bytes ${mem.heapUsed}\n`;
  sys += '# HELP process_heap_total_bytes Heap total in bytes\n';
  sys += '# TYPE process_heap_total_bytes gauge\n';
  sys += `process_heap_total_bytes ${mem.heapTotal}\n`;
  sys += '# HELP process_external_memory_bytes External memory in bytes\n';
  sys += '# TYPE process_external_memory_bytes gauge\n';
  sys += `process_external_memory_bytes ${mem.external}\n`;
  sys += '# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds\n';
  sys += '# TYPE process_cpu_user_seconds_total counter\n';
  sys += `process_cpu_user_seconds_total ${cpu.user / 1e6}\n`;
  sys += '# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds\n';
  sys += '# TYPE process_cpu_system_seconds_total counter\n';
  sys += `process_cpu_system_seconds_total ${cpu.system / 1e6}\n`;
  sys += '# HELP process_uptime_seconds Process uptime in seconds\n';
  sys += '# TYPE process_uptime_seconds gauge\n';
  sys += `process_uptime_seconds ${uptime}\n`;
  return sys;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const users = await prisma.user.findMany({ select: { login: true, login_count: true } });
    let metrics = getSystemMetrics();
    metrics += '\n# HELP user_login_count Number of user logins\n';
    metrics += '# TYPE user_login_count gauge\n';
    for (const user of users) {
      if (user.login_count > 0) {
        // Escape login for Prometheus label value
        const safeLogin = String(user.login).replace(/"/g, '\"');
        metrics += `user_login_count{login=\"${safeLogin}\"} ${user.login_count}\n`;
      }
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('# Error generating metrics');
  }
} 
import { Task } from '../types';

/**
 * Calculates the distance between two points using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Optimizes a list of tasks using a simple Greedy Nearest Neighbor algorithm.
 * Starting from the first task (or a provided start point), it always picks the closest next task.
 */
export function optimizeRoute(tasks: Task[], startLat?: number, startLng?: number): Task[] {
  if (tasks.length <= 1) return tasks;

  const unvisited = [...tasks];
  const optimized: Task[] = [];
  
  // Filter out tasks without coordinates
  const validTasks = unvisited.filter(t => t.address.lat && t.address.lng);
  const invalidTasks = unvisited.filter(t => !t.address.lat || !t.address.lng);

  if (validTasks.length === 0) return tasks;

  let currentLat = startLat ?? validTasks[0].address.lat!;
  let currentLng = startLng ?? validTasks[0].address.lng!;

  while (validTasks.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < validTasks.length; i++) {
      const task = validTasks[i];
      const dist = calculateDistance(currentLat, currentLng, task.address.lat!, task.address.lng!);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const nextTask = validTasks.splice(closestIndex, 1)[0];
    optimized.push(nextTask);
    currentLat = nextTask.address.lat!;
    currentLng = nextTask.address.lng!;
  }

  return [...optimized, ...invalidTasks];
}

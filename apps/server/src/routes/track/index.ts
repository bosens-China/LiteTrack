import type { FastifyPluginAsync } from 'fastify';
import readRoutes from '../../modules/track/read-routes.js';
import writeRoutes from '../../modules/track/write-routes.js';

const track: FastifyPluginAsync = async (fastify) => {
  await fastify.register(writeRoutes);
  await fastify.register(readRoutes);
};

export default track;

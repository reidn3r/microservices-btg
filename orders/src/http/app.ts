import dotenv from 'dotenv';
import fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { RabbitMQ } from '../amqp/rabbitmq';
import { redis } from '../../db/redis';
import { RedisRead } from './services/redis-read';
import { RedisStore } from './services/redis-store';
import { GetOrderAmount } from './routes/get-order-amount';
import { GetOrderValue } from './routes/get-order-value';
dotenv.config();

//env. variables
const amqp_uri:string = process.env.AMQP_URI as string;
const queue:string = process.env.ORDERS_QUEUE as string;

//Fastify Instance
const app = fastify();
app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

//Services instances
const rabbitmq = new RabbitMQ(amqp_uri);
const store = new RedisStore();
const read = new RedisRead();

//routes
app.register(GetOrderAmount, { read });
app.register(GetOrderValue, { read });

const PORT = 8000;
app.listen({ port: PORT }, async() => {
    await Promise.all([rabbitmq.start(), redis.connect()]);
    
    await rabbitmq.consume(queue, async(message) => {
        const payload = JSON.parse(message.content.toString());
        await store.execute(payload);
        
    });
    console.log(`orders-service: http://localhost:${PORT}`);
})
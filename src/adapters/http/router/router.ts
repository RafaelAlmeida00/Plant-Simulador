// src/adapters/http/router/router.ts

import express from 'express';
import cookie from 'cookie-parser';
import cors from 'cors';

import ControllerRoot from '../controllers/controllerRoot';
import EventsController from '../controllers/EventsController';
import StopsController from '../controllers/StopsController';
import BuffersController from '../controllers/BuffersController';
import PlantStateController from '../controllers/PlantStateController';
import HealthController from '../controllers/HealthController';

class AppRouter {
    router: express.Router;

    constructor() {
        this.router = express.Router();
        this.initializeGlobalMiddlewares();
        this.initializeRoutes();
    }

    initializeGlobalMiddlewares() {
        this.router.use(cookie());
        this.router.use(cors());
    }

    initializeRoutes() {
        // Root
        this.router.get('/', ControllerRoot.handle);

        // Events API - CRUD completo
        this.router.get('/api/events', (req, res) => EventsController.getAll(req, res));
        this.router.get('/api/events/:id', (req, res) => EventsController.getById(req, res));
        this.router.post('/api/events', (req, res) => EventsController.create(req, res));
        this.router.put('/api/events/:id', (req, res) => EventsController.update(req, res));
        this.router.delete('/api/events/:id', (req, res) => EventsController.delete(req, res));

        // Stops API - CRUD completo
        this.router.get('/api/stops', (req, res) => StopsController.getAll(req, res));
        this.router.get('/api/stops/active', (req, res) => StopsController.getActive(req, res));
        this.router.get('/api/stops/:id', (req, res) => StopsController.getById(req, res));
        this.router.post('/api/stops', (req, res) => StopsController.create(req, res));
        this.router.put('/api/stops/:id', (req, res) => StopsController.update(req, res));
        this.router.delete('/api/stops/:id', (req, res) => StopsController.delete(req, res));

        // Buffers API - CRUD completo
        this.router.get('/api/buffers', (req, res) => BuffersController.getAll(req, res));
        this.router.get('/api/buffers/latest', (req, res) => BuffersController.getLatest(req, res));
        this.router.get('/api/buffers/:id', (req, res) => BuffersController.getById(req, res));
        this.router.post('/api/buffers', (req, res) => BuffersController.create(req, res));
        this.router.put('/api/buffers/:id', (req, res) => BuffersController.update(req, res));
        this.router.delete('/api/buffers/:id', (req, res) => BuffersController.delete(req, res));

        // Plant State API - CRUD completo
        this.router.get('/api/plantstate', (req, res) => PlantStateController.getAll(req, res));
        this.router.get('/api/plantstate/latest', (req, res) => PlantStateController.getLatest(req, res));
        this.router.get('/api/plantstate/:id', (req, res) => PlantStateController.getById(req, res));
        this.router.post('/api/plantstate', (req, res) => PlantStateController.create(req, res));
        this.router.put('/api/plantstate/:id', (req, res) => PlantStateController.update(req, res));
        this.router.delete('/api/plantstate/:id', (req, res) => PlantStateController.delete(req, res));

        // Health API
        this.router.get('/api/health', (req, res) => HealthController.handle(req, res));
        this.router.get('/api/health/detailed', (req, res) => HealthController.handleDetailed(req, res));
    }

    getRouter() {
        return this.router;
    }
}

export default new AppRouter().getRouter();
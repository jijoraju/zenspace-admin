const express = require('express');
const {PrismaClient} = require("@prisma/client");
const {hash, genSalt} = require("bcrypt");

const prisma = new PrismaClient();
const locationRouter = express.Router();

locationRouter.get('/', async (req, res) => {
    let { page, size, search } = req.query;
    page = page ? parseInt(page, 10) : 1;
    size = size ? parseInt(size, 10) : 10;
    const skip = (page - 1) * size;

    const searchQuery = search ? { name: { contains: search, mode: 'insensitive' } } : {};

    try {
        const locations = await prisma.location.findMany({
            where: searchQuery,
            skip: skip,
            take: size
        });
        const total = await prisma.location.count({ where: searchQuery });
        const totalPages = Math.ceil(total / size);

        res.render('locations/index', { locations, page, totalPages, search });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/dashboard');
    }
});

locationRouter.get('/create', (req, res) => {
    res.render('locations/new');
});

locationRouter.post('/create', async (req, res) => {
    const { name, province, latitude, longitude } = req.body;
    try {
        await prisma.location.create({
            data: { name, province, latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
        });
        req.flash('success', 'Location created successfully');
        res.redirect('/locations');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/locations/create');
    }
});

locationRouter.get('/:location_id/edit', async (req, res) => {
    const locationId = parseInt(req.params.location_id, 10);
    try {
        const location = await prisma.location.findUnique({ where: { location_id: locationId } });
        if (!location) {
            req.flash('error', 'Location not found');
            return res.redirect('/locations');
        }
        res.render('locations/edit', { location });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/locations');
    }
});

locationRouter.post('/:location_id/edit', async (req, res) => {
    const locationId = parseInt(req.params.location_id, 10);
    const { name, province, latitude, longitude } = req.body;
    try {
        await prisma.location.update({
            where: { location_id: locationId },
            data: { name, province, latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
        });
        req.flash('success', 'Location updated successfully');
        res.redirect('/locations');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect(`/locations/${locationId}/edit`);
    }
});

locationRouter.post('/:location_id/delete', async (req, res) => {
    const locationId = parseInt(req.params.location_id, 10);
    try {
        await prisma.location.delete({ where: { location_id: locationId } });
        req.flash('success', 'Location deleted successfully');
        res.redirect('/locations');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/locations');
    }
});






module.exports = locationRouter;

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const amenityRouter = express.Router();

amenityRouter.get('/create', (req, res) => {
    res.render('amenities/create');
});

amenityRouter.post('/create', async (req, res) => {
    try {
        const { description } = req.body;
        await prisma.amenity.create({ data: { description } });

        req.flash('success', 'Amenity created successfully');
        res.redirect('/amenities');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/amenities');
    }
});

amenityRouter.get('/', async (req, res) => {
    try {
        const amenities = await prisma.amenity.findMany();
        res.render('amenities/index', { amenities });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/amenities');
    }
});

amenityRouter.get('/:amenity_id/edit', async (req, res) => {
    try {
        const amenity = await prisma.amenity.findUnique({
            where: { amenity_id: parseInt(req.params.amenity_id) },
        });
        res.render('amenities/edit', { amenity });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/amenities');
    }
});

amenityRouter.post('/:amenity_id/edit', async (req, res) => {
    try {
        const { description } = req.body;
        await prisma.amenity.update({
            where: { amenity_id: parseInt(req.params.amenity_id) },
            data: { description },
        });
        req.flash('success', 'Amenity updated successfully');
        res.redirect('/amenities');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/amenities');
    }
});

amenityRouter.post('/:amenity_id/delete', async (req, res) => {
    try {
        await prisma.amenity.delete({
            where: { amenity_id: parseInt(req.params.amenity_id) },
        });
        req.flash('success', 'Amenity deleted successfully');
        res.redirect('/amenities');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/amenities');
    }
});




module.exports = amenityRouter;

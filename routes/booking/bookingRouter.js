const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const bookingRouter = express.Router();

bookingRouter.get('/', async (req, res) => {
    let { page, size, search } = req.query;
    page = page ? parseInt(page, 10) : 1;
    size = size ? parseInt(size, 10) : 10;
    const skip = (page - 1) * size;

    const searchQuery = search ? {
        OR: [
            { bookingReference: { contains: search, mode: 'insensitive' } },
            { user: { first_name: { contains: search, mode: 'insensitive' } } },
            { user: { last_name: { contains: search, mode: 'insensitive' } } }
        ]
    } : {};

    try {
        const bookings = await prisma.booking.findMany({
            where: searchQuery,
            include: { user: true },
            skip: skip,
            take: size
        });
        const total = await prisma.booking.count({ where: searchQuery });
        const totalPages = Math.ceil(total / size);

        res.render('bookings/index', { bookings, page, totalPages, search });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/dashboard');
    }
});

bookingRouter.get('/:booking_id', async (req, res) => {
    const bookingId = parseInt(req.params.booking_id, 10);
    try {
        const booking = await prisma.booking.findUnique({
            where: { booking_id: bookingId },
            include: {
                user: true,
                workspace: true
            }
        });
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/bookings');
        }
        res.render('bookings/detail', { booking });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/bookings');
    }
});

bookingRouter.post('/:booking_id/cancel', async (req, res) => {
    const bookingId = parseInt(req.params.booking_id, 10);
    try {
        await prisma.booking.update({
            where: { booking_id: bookingId },
            data: { status: 'CANCELLED' }
        });
        req.flash('success', 'Booking cancelled successfully');
        res.redirect('/bookings/' + bookingId);
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/bookings/' + bookingId);
    }
});




module.exports = bookingRouter;

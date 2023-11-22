const express = require('express');
const {PrismaClient, WorkspaceType} = require("@prisma/client");
const {hash, genSalt} = require("bcrypt");
const {bucket, admin} = require("../../config/firebaseAdmin");
const multer = require("multer");
const {v4: uuidv4} = require('uuid');

const prisma = new PrismaClient();
const workspaceRouter = express.Router();

const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(), fileFilter: imageFilter
});


workspaceRouter.get('/', async (req, res) => {
    let {page, size, search} = req.query;
    page = page ? parseInt(page, 10) : 1;
    size = size ? parseInt(size, 10) : 10; 
    const skip = (page - 1) * size;
    const searchQuery = search ? {name: {contains: search, mode: 'insensitive'}} : {};

    try {
        const workspaces = await prisma.workspace.findMany({
            where: searchQuery, skip: skip, take: size,
        });
        const total = await prisma.workspace.count({where: searchQuery});
        const totalPages = Math.ceil(total / size);

        res.render('workspaces/index', {workspaces, page, totalPages, search});
    } catch (error) {
        res.status(500).send(error.message);
    }
});


workspaceRouter.get('/create', async (req, res) => {
    try {
        const locations = await prisma.location.findMany();
        res.render('workspaces/new', {locations});
    } catch (error) {
        res.status(500).send(error.message);
    }
});

workspaceRouter.post('/', async (req, res) => {
    const {
        name, description, workspace_type, price_per_day, no_of_spaces, location_id, address, latitude, longitude
    } = req.body;

    try {
        const workspaceAddress = await prisma.workspaceAddress.create({
            data: {
                address, latitude: parseFloat(latitude), longitude: parseFloat(longitude),
            },
        });

        if (workspace_type !== 'ONE_DAY' && workspace_type !== 'MULTIPLE_DAYS') {
            throw Error("Invalid workspace type");
        }

        const newWorkspace = await prisma.workspace.create({
            data: {
                name,
                description,
                workspace_type,
                price_per_day: parseFloat(price_per_day),
                no_of_spaces: parseInt(no_of_spaces, 10),
                location_id: parseInt(location_id, 10),
                address_id: workspaceAddress.workspace_address_id,
            },
        });

        req.flash('success', 'New workspace created successfully.');
        res.redirect('/workspace');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/workspace');
    }
});

workspaceRouter.get('/:workspace_id', async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);
    try {
        const workspace = await prisma.workspace.findUnique({
            where: {workspace_id: workspaceId}, include: {
                workspacePhotos: true, reviews: true, location: true, workspaceAddress: true
            },
        });

        if (!workspace) {
            return res.status(404).send('Workspace not found.');
        }

        res.render('workspaces/details', {workspace});
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

workspaceRouter.post('/:workspace_id/delete', async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);
    try {
        // Check for existing bookings
        const bookings = await prisma.booking.findMany({
            where: {workspace_id: workspaceId}
        });

        if (bookings.length > 0) {
            req.flash('error', 'Cannot delete workspace as there are existing bookings.');
            return res.redirect(`/workspace/${workspaceId}`);
        }

        await prisma.workspace.delete({
            where: {workspace_id: workspaceId}
        });

        req.flash('success', 'Workspace successfully deleted.');
        res.redirect('/workspace');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect(`/workspace/${workspaceId}`);
    }
});

workspaceRouter.get('/:workspace_id/edit', async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);
    try {
        const workspace = await prisma.workspace.findUnique({
            where: {workspace_id: workspaceId},
            include: {workspaceAddress: true}
        });

        const locations = await prisma.location.findMany();

        if (!workspace) {
            return res.status(404).send('Workspace not found.');
        }

        res.render('workspaces/edit', {workspace, locations});
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});


workspaceRouter.post('/:workspace_id/edit', async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);
    const {name, description, price_per_day, no_of_spaces, location_id, address, latitude, longitude} = req.body;

    try {
        await prisma.workspace.update({
            where: {workspace_id: workspaceId},
            data: {
                name,
                description,
                price_per_day: parseFloat(price_per_day),
                no_of_spaces: parseInt(no_of_spaces, 10),
                location: {
                    connect: {location_id: parseInt(location_id)},
                },
                workspaceAddress: {
                    update: {
                        address,
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude)
                    }
                }
            }
        });

        req.flash('success', 'Workspace updated successfully.');
        res.redirect('/workspace');
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect(`/workspace/${workspaceId}/edit`);
    }
});

workspaceRouter.post('/:workspace_id/delete-review/:review_id', async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);
    const reviewId = parseInt(req.params.review_id, 10);

    try {
        await prisma.review.delete({
            where: {review_id: reviewId}
        });

        req.flash('success', 'Review deleted successfully.');
        res.redirect(`/workspace/${workspaceId}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to delete the review.');
        res.redirect(`/workspace/${workspaceId}`);
    }
});

workspaceRouter.post('/:workspace_id/upload', upload.single('image'), async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);

    if (!req.file) {
        return res.status(400).send('No file uploaded or file is not an image.');
    }

    const fileExtension = req.file.originalname.split('.').pop();
    const newFileName = `${uuidv4()}.${fileExtension}`;
    const blob = bucket.file(newFileName);

    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: req.file.mimetype,
        },
    });

    blobStream.on('error', (error) => {
        console.error('Something is wrong! Unable to upload at the moment.\n', error);
        res.status(500).send({error: 'Unable to upload at the moment.'});
    });

    blobStream.on('finish', async () => {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(blob.name)}`;

        try {
            const newPhoto = await prisma.workspacePhoto.create({
                data: {
                    photo_url: publicUrl, workspace: {
                        connect: {workspace_id: workspaceId}
                    },
                },
            });
            console.log('File uploaded to Firebase Storage and URL saved to the database.', newPhoto);

            res.redirect(`/workspace/${workspaceId}`);
        } catch (error) {
            console.error('Unable to save the URL to the database.\n', error);
            res.status(500).send({error: 'Unable to save the URL to the database.'});
        }
    });

    blobStream.end(req.file.buffer);
});

workspaceRouter.post('/:workspace_id/delete-photo/:photo_id', async (req, res) => {
    const workspaceId = parseInt(req.params.workspace_id, 10);
    const photoId = parseInt(req.params.photo_id, 10);

    try {
        // Fetch the photo record to get the URL
        const photo = await prisma.workspacePhoto.findUnique({
            where: {photo_id: photoId}
        });

        if (!photo) {
            req.flash('error', 'Photo not found.');
            return res.redirect(`/workspace/${workspaceId}`);
        }

        // Extract the file name from the URL
        const fileName = photo.photo_url.split('/').pop();

        // Delete the file from Firebase Storage
        await bucket.file(decodeURIComponent(fileName)).delete();

        // Delete the photo record from the database
        await prisma.workspacePhoto.delete({
            where: {photo_id: photoId}
        });

        req.flash('success', 'Photo deleted successfully.');
        res.redirect(`/workspace/${workspaceId}`);
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to delete the photo.');
        res.redirect(`/workspace/${workspaceId}`);
    }
});


module.exports = workspaceRouter;

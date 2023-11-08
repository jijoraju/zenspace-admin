const express = require('express');
const {PrismaClient} = require("@prisma/client");
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
    size = size ? parseInt(size, 10) : 10; // Default size of 10 items per page
    const skip = (page - 1) * size;
    const searchQuery = search ? {name: {contains: search}} : {};

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

        res.redirect('/workspace');
    } catch (error) {
        res.status(500).send(error.message);
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

module.exports = workspaceRouter;

const multer = require('multer');
const sharp = require('sharp'); //image processing library
const Tour = require('../models/tourModel');
//const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Not an image!. Please upload only image files.', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  //console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  //1) COver image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`); //put the image cover body to the file name

  //2) Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`); //put the image cover body to the file name
      req.body.images.push(filename);
    })
  );

  next();
});

// upload.single('image'); req.file
// upload.array('images', 5); req.files

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage.price';
  req.query.fields = 'name, price, ratingsAverage, summary, difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' }); //{ path: 'reviews', select for field });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        //match (filter, select certain document)
        ratingsAverage: { $gte: 4.5 },
      },
    },
    {
      $group: {
        //group document together for accumulator (like using rating of a grup and calculate rating avg)
        _id: { $toUpper: '$difficulty' },
        //_id: '$ratingsAverage',
        //_id: null, //get all
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: -1 }, //1 to asc, -1 for dsc
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }, //not eaqual to easy (excluding easy tour)
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //2021 - transform to number in param
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', //break document to diffirent startDates array
    },
    {
      $match: {
        startDates: {
          //only filter 2021 year in params
          $gte: new Date(`${year}-01-01`), //first day of the year
          $lte: new Date(`${year}-12-31`), //last day of the year
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, //group by the month (read docs mongo)
        numToursStarts: { $sum: 1 }, //count tour by the month
        tours: { $push: '$name' }, //push tour to array to show about which tours in that month
      },
    },
    {
      $addFields: { month: '$_id' }, //show month
    },
    {
      $project: {
        _id: 0, //1 is display, 0 is hiding
      },
    },
    {
      $sort: {
        numTourStarts: -1, //sort from highest number of tours to lowest each month
      },
    },
    {
      $limit: 12, //limit 12 output display
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

//get tour within 170 sectio 10
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.128131,-118.142537/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3969.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longtitude in the format lat, lng'
      ),
      400
    );
  }

  //console.log(distance, lat, lng, unit);
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longtitude in the format lat, lng'
      ),
      400
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});

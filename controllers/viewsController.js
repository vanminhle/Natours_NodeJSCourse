const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.local.alert =
      'Your booking is successfully, please check your email for confirmation. Please come back later if it not show up here!';
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  //1) Get Tour Data from Collection
  const tours = await Tour.find();

  //2) Build template

  //3) Render that data template using tour data from 1

  res.status(200).render('overview', {
    title: 'All Tours',
    tours, //this is a array
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  //1) Get the data, for the requested tour(including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    field: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  //2) Build template

  //3) Render template using data from 1

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Login into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //YOU CAN USING VIRTUAL POPULATE LIKE TOUR WITH REVIEWS HERE, IT WILL BE THE SAME
  //1) find all booking of currently loggin user
  const bookings = await Booking.find({ user: req.user.id });

  //2) find tours with the returend ids
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Booked Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  //console.log('UPDATING USER', req.body);
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});

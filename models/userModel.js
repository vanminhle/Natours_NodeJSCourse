const crypto = require('crypto');
const mongoose = require('mongoose');
const { default: validator } = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email address'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
  },
  photo: {
    type: String,
    default: '/default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, //hiding password when output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please comfirm your password'],
    validate: {
      //This only works works on CREATE and SAVE!
      validator: function (el) {
        return el === this.password; //passcon = abc ; pass = abc ; => true
      },
      message: 'Confirm Password are not the same as your password',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date, //limit time for reset password
  active: {
    //active account
    type: Boolean,
    default: true,
    select: false,
  },
});

//using document middleware for passsword encryption section 8, only run if password is modified
userSchema.pre('save', async function (next) {
  //if password (on this doc) has not been modified, modified == false
  if (!this.isModified('password')) return next();

  //bcrypt - 12 is the level for encryption (10 is default)
  this.password = await bcrypt.hash(this.password, 12);

  //Delete confirm password field beacuse it only used for validation
  this.passwordConfirm = undefined;
  next();
});

//set the password changed at time field
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next(); //if password has not been modified

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//Not showing account that inactive in query
userSchema.pre(/^find/, function (next) {
  //this points to the current query
  this.find({ active: { $ne: false } }); //document that not = false
  next();
});

//instance method checking password, true if pass same, false if not through login
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //candidate pass is from login not hashed, user pass is from dtb and it hashed
  return await bcrypt.compare(candidatePassword, userPassword);
};

//instance method changed Password After, token issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
    //time token issued less than changed timestamp (100 < 200) change password after token issued
  }

  return false;
  //false mean user has not changed password before token is expired
};

//instance method createPasswordResetToken
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;

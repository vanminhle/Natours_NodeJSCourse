class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1) Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    //console.log(req.query , queryObj);

    // 2) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); //reqular expression
    //console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      //console.log(sortBy);
      this.query = this.query.sort(sortBy);
      //sort('price ratingsAverage')
    } else {
      //query = query.sort('-createdAt'); //(As we created the collection with copying a file at once, all createdAt timestamp are the same ref: https://stackoverflow.com/questions/68475942/couldnt-paginate-properly-using-skip-limit-mongoose-method-in-express-app).

      this.query = this.query.sort('_id');
    }
    return this;
  }

  limitFields() {
    // 3) Field Limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' '); //old is .join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); //DEFAULT
    }

    return this;
  }

  paginate() {
    // 4) Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    //page=2&limit=10 , 1-10 page1; 11-20 page2; 21-30 page3;etc so why we need skip 10 result, limit 10
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;

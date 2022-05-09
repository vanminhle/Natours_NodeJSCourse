/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51Kwk2hFSinNEnVrwqV6xGe7Bc7feZ6DhK4WZrXg7xrvikJcSohbm0DcdpP0ZEfP7LJXrCLcSJI9VooivVgHO5EdC002ugP0YbO'
);

export const bookTour = async (tourId) => {
  try {
    //1) get the session form the server (from api route)
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

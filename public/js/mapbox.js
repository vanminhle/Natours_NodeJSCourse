/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidmFubWluaGxlIiwiYSI6ImNsMnBqeHl6bDJsOWUzYnA5anV0NW9nZDIifQ._mAL0tbrBygYpw0peUD1vw';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/vanminhle/cl2plfsbe00cn14o7o2lbipo7',
    scrollZoom: false,
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: true,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Create a marker
    const el = document.createElement('div');
    el.className = 'marker';

    //Add a marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    //Add popup
    new mapboxgl.Popup({ offset: 30, focusAfterOpen: false })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    //Extend map bounds to include current location
    bounds.extend(loc.coordinates);

    map.fitBounds(bounds, {
      padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100,
      },
    });
  });
};

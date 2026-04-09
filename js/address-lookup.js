/* Optional address lookup helper (Nominatim provider). */
(function () {
  var googleMapsLoaderPromise = null;

  function resolveElement(value) {
    if (!value) return null;
    if (typeof value === 'string') return document.querySelector(value);
    return value;
  }

  function pickFirst(obj, keys) {
    if (!obj) return '';
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (obj[key]) return String(obj[key]).trim();
    }
    return '';
  }

  function formatAddressLine1(address) {
    var number = pickFirst(address, ['house_number']);
    var street = pickFirst(address, ['road', 'pedestrian', 'footway', 'path', 'residential']);
    var line1 = [number, street].filter(Boolean).join(' ').trim();
    if (line1) return line1;
    return pickFirst(address, ['building', 'amenity', 'shop', 'tourism']);
  }

  function parseNominatimResult(item) {
    var address = item && item.address ? item.address : {};
    return {
      addressLine1: formatAddressLine1(address),
      suburb: pickFirst(address, ['suburb', 'city_district', 'town', 'city', 'village', 'hamlet', 'county']),
      state: pickFirst(address, ['state', 'territory', 'region']),
      postcode: pickFirst(address, ['postcode']),
      country: pickFirst(address, ['country'])
    };
  }

  function parseGoogleAddressComponents(details) {
    var byType = {};
    var components = (details && details.address_components) || [];
    components.forEach(function (component) {
      (component.types || []).forEach(function (type) {
        if (!byType[type]) byType[type] = component;
      });
    });

    var streetNumber = byType.street_number ? byType.street_number.long_name : '';
    var route = byType.route ? byType.route.long_name : '';
    var locality =
      (byType.locality && byType.locality.long_name) ||
      (byType.sublocality && byType.sublocality.long_name) ||
      (byType.sublocality_level_1 && byType.sublocality_level_1.long_name) ||
      (byType.postal_town && byType.postal_town.long_name) ||
      '';
    var state =
      (byType.administrative_area_level_1 && byType.administrative_area_level_1.short_name) ||
      (byType.administrative_area_level_2 && byType.administrative_area_level_2.long_name) ||
      '';
    var postcode = byType.postal_code ? byType.postal_code.long_name : '';
    var country = byType.country ? byType.country.long_name : '';

    return {
      addressLine1: [streetNumber, route].filter(Boolean).join(' ').trim(),
      suburb: locality,
      state: state,
      postcode: postcode,
      country: country
    };
  }

  function setFieldValue(input, value) {
    if (!input || !value) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function debounce(fn, waitMs) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, waitMs);
    };
  }

  function getGoogleCountryRestriction() {
    var raw = String(window.ADDRESS_LOOKUP_COUNTRY_CODES || '').trim();
    if (!raw) return null;
    var codes = raw.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    if (!codes.length) return null;
    return codes.length === 1 ? codes[0] : codes;
  }

  function ensureGoogleMapsLoaded() {
    if (window.google && window.google.maps && window.google.maps.places) {
      return Promise.resolve(window.google);
    }
    if (googleMapsLoaderPromise) return googleMapsLoaderPromise;

    var key = String(window.GOOGLE_PLACES_API_KEY || '').trim();
    if (!key) return Promise.reject(new Error('GOOGLE_PLACES_API_KEY is not set'));

    googleMapsLoaderPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-google-places-loader="true"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.google); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Failed to load Google Places script')); }, { once: true });
        return;
      }

      var callbackName = '__onGooglePlacesLoaded';
      window[callbackName] = function () {
        try { delete window[callbackName]; } catch (e) {}
        resolve(window.google);
      };

      var script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.dataset.googlePlacesLoader = 'true';
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&libraries=places&callback=' + callbackName;
      script.onerror = function () {
        try { delete window[callbackName]; } catch (e) {}
        reject(new Error('Failed to load Google Places script'));
      };
      document.head.appendChild(script);
    });

    return googleMapsLoaderPromise;
  }

  function attachAddressLookup(options) {
    options = options || {};
    if (!window.ADDRESS_LOOKUP_ENABLED) return function () {};

    var searchInput = resolveElement(options.searchInput || options.searchInputSelector);
    if (!searchInput) return function () {};
    if (searchInput.dataset.lookupAttached === 'true') return function () {};

    var form = options.form || searchInput.closest('form, .form') || document;
    var resultsContainer = resolveElement(options.resultsContainer || options.resultsContainerSelector);
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.className = 'address-lookup-results';
      searchInput.insertAdjacentElement('afterend', resultsContainer);
    }

    var fields = options.fields || {};
    var target = {
      addressLine1: resolveElement(fields.addressLine1),
      suburb: resolveElement(fields.suburb),
      state: resolveElement(fields.state),
      postcode: resolveElement(fields.postcode),
      country: resolveElement(fields.country)
    };

    if (!target.addressLine1) target.addressLine1 = form.querySelector('input[name="addressLine1"]');
    if (!target.suburb) target.suburb = form.querySelector('input[name="suburb"]');
    if (!target.state) target.state = form.querySelector('input[name="state"]');
    if (!target.postcode) target.postcode = form.querySelector('input[name="postcode"]');
    if (!target.country) target.country = form.querySelector('input[name="country"]');

    var minChars = Number(window.ADDRESS_LOOKUP_MIN_CHARS || 3);
    var debounceMs = Number(window.ADDRESS_LOOKUP_DEBOUNCE_MS || 450);
    var endpoint = 'https://nominatim.openstreetmap.org/search';
    var countryCodes = String(window.ADDRESS_LOOKUP_COUNTRY_CODES || '').trim();
    var suggestions = [];
    var activeToken = 0;
    var lastRequestAt = 0;
    var destroyed = false;
    var provider = String(window.ADDRESS_LOOKUP_PROVIDER || 'nominatim').toLowerCase();
    var googleAutocompleteService = null;
    var googlePlacesService = null;
    var googleSessionToken = null;

    function closeResults() {
      resultsContainer.classList.remove('open');
      resultsContainer.innerHTML = '';
    }

    function openResults() {
      if (!resultsContainer.innerHTML.trim()) return;
      resultsContainer.classList.add('open');
    }

    function renderSuggestions(items) {
      suggestions = items.slice(0, 6);
      if (!suggestions.length) {
        closeResults();
        return;
      }
      var html = suggestions.map(function (item, idx) {
        var label = '';
        if (item) label = item.display_name || item.description || '';
        return '<button type="button" class="address-lookup-item" data-index="' + idx + '">' + escapeHtml(label) + '</button>';
      }).join('');
      resultsContainer.innerHTML = html;
      openResults();
    }

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function applySelection(item) {
      if (!item) return;
      if (provider === 'google') {
        if (!googlePlacesService || !window.google || !window.google.maps || !window.google.maps.places) {
          closeResults();
          return;
        }

        googlePlacesService.getDetails(
          {
            placeId: item.place_id,
            fields: ['address_components', 'formatted_address']
          },
          function (details, status) {
            if (destroyed) return;
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !details) {
              closeResults();
              return;
            }
            var parsedGoogle = parseGoogleAddressComponents(details);
            setFieldValue(target.addressLine1, parsedGoogle.addressLine1);
            setFieldValue(target.suburb, parsedGoogle.suburb);
            setFieldValue(target.state, parsedGoogle.state);
            setFieldValue(target.postcode, parsedGoogle.postcode);
            setFieldValue(target.country, parsedGoogle.country);
            searchInput.value = details.formatted_address || item.description || searchInput.value;
            closeResults();
          }
        );
        return;
      }

      var parsed = parseNominatimResult(item);
      setFieldValue(target.addressLine1, parsed.addressLine1);
      setFieldValue(target.suburb, parsed.suburb);
      setFieldValue(target.state, parsed.state);
      setFieldValue(target.postcode, parsed.postcode);
      setFieldValue(target.country, parsed.country);
      searchInput.value = item.display_name || searchInput.value;
      closeResults();
    }

    async function runLookup(rawQuery) {
      var query = String(rawQuery || '').trim();
      if (query.length < minChars) {
        closeResults();
        return;
      }

      var token = ++activeToken;
      resultsContainer.innerHTML = '<div class="address-lookup-status">Searching...</div>';
      openResults();

      try {
        if (provider === 'google') {
          await ensureGoogleMapsLoaded();
          if (destroyed || token !== activeToken) return;

          if (!googleAutocompleteService) {
            googleAutocompleteService = new window.google.maps.places.AutocompleteService();
          }
          if (!googlePlacesService) {
            var host = document.createElement('div');
            host.style.display = 'none';
            document.body.appendChild(host);
            googlePlacesService = new window.google.maps.places.PlacesService(host);
          }
          if (!googleSessionToken) {
            googleSessionToken = new window.google.maps.places.AutocompleteSessionToken();
          }

          var restriction = getGoogleCountryRestriction();
          var request = {
            input: query,
            sessionToken: googleSessionToken,
            types: ['address']
          };
          if (restriction) request.componentRestrictions = { country: restriction };

          googleAutocompleteService.getPlacePredictions(request, function (predictions, status) {
            if (destroyed || token !== activeToken) return;
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions || !predictions.length) {
              closeResults();
              return;
            }
            renderSuggestions(predictions);
          });
          return;
        }

        var elapsed = Date.now() - lastRequestAt;
        var waitMs = elapsed >= 1000 ? 0 : 1000 - elapsed;
        if (waitMs) {
          await new Promise(function (resolve) { setTimeout(resolve, waitMs); });
        }
        lastRequestAt = Date.now();

        var url = new URL(endpoint);
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '6');
        if (countryCodes) url.searchParams.set('countrycodes', countryCodes);
        var response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Lookup request failed');
        var payload = await response.json();
        if (destroyed || token !== activeToken) return;
        renderSuggestions(Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (destroyed || token !== activeToken) return;
        closeResults();
      }
    }

    var onInput = debounce(function () {
      runLookup(searchInput.value);
    }, debounceMs);

    function onResultsClick(event) {
      var btn = event.target.closest('.address-lookup-item');
      if (!btn) return;
      var idx = Number(btn.dataset.index);
      if (Number.isNaN(idx)) return;
      applySelection(suggestions[idx]);
    }

    function onDocPointerDown(event) {
      if (event.target === searchInput) return;
      if (resultsContainer.contains(event.target)) return;
      closeResults();
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') closeResults();
    }

    function onFocus() {
      if (suggestions.length) openResults();
    }

    searchInput.addEventListener('input', onInput);
    searchInput.addEventListener('keydown', onKeyDown);
    searchInput.addEventListener('focus', onFocus);
    resultsContainer.addEventListener('click', onResultsClick);
    document.addEventListener('pointerdown', onDocPointerDown);
    searchInput.dataset.lookupAttached = 'true';

    return function detachAddressLookup() {
      destroyed = true;
      searchInput.removeEventListener('input', onInput);
      searchInput.removeEventListener('keydown', onKeyDown);
      searchInput.removeEventListener('focus', onFocus);
      resultsContainer.removeEventListener('click', onResultsClick);
      document.removeEventListener('pointerdown', onDocPointerDown);
      searchInput.dataset.lookupAttached = 'false';
      googleSessionToken = null;
      closeResults();
    };
  }

  window.attachAddressLookup = attachAddressLookup;
})();

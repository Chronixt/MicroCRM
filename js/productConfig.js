/**
 * Product Configuration Layer
 *
 * Loads profile definitions from js/products/* and exposes a stable
 * ProductConfig API for the rest of the app.
 */

(function () {
  'use strict';

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function mergeDeep(base, override) {
    if (!isObject(base) || !isObject(override)) return override;
    var out = { ...base };
    Object.keys(override).forEach(function (key) {
      var baseVal = out[key];
      var nextVal = override[key];
      if (isObject(baseVal) && isObject(nextVal)) {
        out[key] = mergeDeep(baseVal, nextVal);
        return;
      }
      out[key] = nextVal;
    });
    return out;
  }

  var profiles = window.ProductProfiles || {};
  var core = window.ProductCore || {};
  var defaultProduct = core.defaultProduct || 'tradie';

  var requestedProduct =
    window.ACTIVE_PRODUCT ||
    window.PRODUCT_PROFILE ||
    defaultProduct;

  var selectedKey = profiles[requestedProduct]
    ? requestedProduct
    : (profiles[defaultProduct] ? defaultProduct : Object.keys(profiles)[0]);

  if (!selectedKey) {
    throw new Error('No product profiles loaded. Expected files under js/products/.');
  }

  var profile = profiles[selectedKey] || {};
  var config = mergeDeep(core.defaultConfig || {}, profile.config || {});
  var productTranslations = {
    en: mergeDeep((core.defaultTranslations || {}).en || {}, (profile.translations || {}).en || {}),
    ja: mergeDeep((core.defaultTranslations || {}).ja || {}, (profile.translations || {}).ja || {})
  };

  function getServiceTypeLabel(id, lang) {
    var language = lang || 'en';
    var serviceType = (config.serviceTypes || []).find(function (s) { return s.id === id; });
    if (!serviceType) return id;
    return language === 'ja' ? (serviceType.labelJa || serviceType.label) : serviceType.label;
  }

  function getServiceTypeLabels(lang) {
    var language = lang || 'en';
    return (config.serviceTypes || []).map(function (s) {
      return language === 'ja' ? (s.labelJa || s.label) : s.label;
    });
  }

  function getReferralTypeLabel(id, lang) {
    var language = lang || 'en';
    var refType = (config.referralTypes || []).find(function (r) { return r.id === id; });
    if (!refType) return id;
    return language === 'ja' ? (refType.labelJa || refType.label) : refType.label;
  }

  function getStatus(id) {
    var statuses = config.statuses || [];
    return statuses.find(function (s) { return s.id === id; }) || statuses[0] || { id: 'unknown', label: 'Unknown', color: '#94a3b8' };
  }

  function getEntityName(entity, plural) {
    var e = (config.entities || {})[entity];
    if (!e) return entity;
    return plural ? e.plural : e.singular;
  }

  function getCustomerField(fieldName) {
    return (config.customerFields || {})[fieldName] || { enabled: false };
  }

  function isFeatureEnabled(featureName) {
    return ((config.features || {})[featureName]) === true;
  }

  function getProductTranslation(key, lang) {
    var language = lang || 'en';
    if (productTranslations[language] && productTranslations[language][key]) {
      return productTranslations[language][key];
    }
    return null;
  }

  window.ProductConfig = {
    config: config,
    activeProduct: selectedKey,

    appName: config.appName,
    appSlug: config.appSlug,
    themeColor: config.themeColor,
    logoLight: config.logoLight,
    logoAlt: config.logoAlt,
    lockTitle: config.lockTitle,

    dbName: config.dbName,
    dbVersion: config.dbVersion,
    storagePrefix: config.storagePrefix,
    useSupabase: config.useSupabase || false,

    serviceTypes: config.serviceTypes || [],
    referralTypes: config.referralTypes || [],
    customerFields: config.customerFields || {},
    statuses: config.statuses || [],
    durationOptions: config.durationOptions || [30, 60, 90],
    defaultDuration: config.defaultDuration || 60,

    getServiceTypeLabel: getServiceTypeLabel,
    getServiceTypeLabels: getServiceTypeLabels,
    getReferralTypeLabel: getReferralTypeLabel,
    getStatus: getStatus,
    getEntityName: getEntityName,
    getCustomerField: getCustomerField,
    isFeatureEnabled: isFeatureEnabled,
    getProductTranslation: getProductTranslation,

    getLegacyBookingTypes: function () {
      return (config.serviceTypes || []).map(function (s) { return s.label; });
    }
  };

  console.log('[ProductConfig] Active product: ' + selectedKey + ' (' + config.appName + ')');
})();

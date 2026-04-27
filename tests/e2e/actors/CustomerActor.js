const { expect } = require('@playwright/test');

class CustomerActor {
  constructor(page) {
    this.page = page;
  }

  async createCustomer(customer) {
    await this.page.getByTestId('nav-new-customer').first().click();
    await expect(this.page.getByTestId('new-customer-form')).toBeVisible();
    await this.page.getByTestId('customer-first-name').fill(customer.firstName);
    await this.page.getByTestId('customer-last-name').fill(customer.lastName);
    await this.page.getByTestId('customer-contact-number').fill(customer.contactNumber);

    const address = this.page.getByTestId('customer-address-line1');
    if (await address.count()) {
      await address.fill(customer.addressLine1);
    }

    await this.page.getByTestId('save-customer-button').click();
    await this.waitForCustomerDetail(customer);
    return this.currentCustomerId();
  }

  async waitForCustomerDetail(customer) {
    await expect(this.page).toHaveURL(/#\/customer\?id=/);
    await expect(this.page.getByTestId('customer-title')).toContainText(customer.firstName);
    await expect(this.page.getByTestId('customer-title')).toContainText(customer.lastName);
  }

  currentCustomerId() {
    const match = this.page.url().match(/[#&?]id=(\d+)/);
    if (!match) throw new Error(`Could not find customer id in URL: ${this.page.url()}`);
    return Number(match[1]);
  }

  async openCustomerBySearch(customer) {
    await this.page.goto('/#/find');
    await expect(this.page.getByTestId('customer-search')).toBeVisible();
    await this.page.getByTestId('customer-search').fill(customer.firstName);
    const result = this.page.getByTestId('customer-results').locator('.list-item').filter({ hasText: customer.firstName });
    await expect(result).toHaveCount(1);
    await result.click();
    await this.waitForCustomerDetail(customer);
  }

  async editCustomer(originalCustomer, updates) {
    await this.page.getByTestId('edit-customer-button').click();
    await expect(this.page.getByTestId('edit-customer-form')).toBeVisible();
    await this.page.getByTestId('customer-contact-number').fill(updates.contactNumber);

    if (updates.lastName) {
      await this.page.getByTestId('customer-last-name').fill(updates.lastName);
    }

    const address = this.page.getByTestId('customer-address-line1');
    if (updates.addressLine1 && await address.count()) {
      await address.fill(updates.addressLine1);
    }

    await this.page.getByTestId('save-customer-button').click();
    await this.waitForCustomerDetail({
      ...originalCustomer,
      ...updates
    });
    await expect(this.page.getByTestId('customer-contact-value')).toContainText(updates.contactNumber);
  }
}

module.exports = { CustomerActor };

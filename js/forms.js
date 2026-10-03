/**
 * ThreadCo - Forms Controller
 * Handles Contact Form validation (name, email, 10-digit phone, file size/mime, policy consent)
 * and Newsletter subscription with clear server-side integration points.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./ui.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ui.js'));
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (uiModule) {
  'use strict';

  const ui = uiModule || {
    showToast: () => {}
  };

  function initForms() {
    initContactForm();
    initNewsletterForms();
  }

  /* ==========================================================================
     1. CONTACT FORM
     ========================================================================== */
  function initContactForm() {
    const messageSection = document.getElementById('message');
    if (!messageSection) return;

    // Look for form or wrap messageSection
    let form = messageSection.querySelector('form');
    if (!form) {
      // Find Send Message button
      const sendBtn = messageSection.querySelector('button[type="button"], button:not([type="reset"])');
      const resetBtn = messageSection.querySelector('button[type="reset"]');

      if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
          e.preventDefault();
          handleContactSubmit();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          clearContactErrors();
          const feedback = document.getElementById('tc-contact-feedback');
          if (feedback) feedback.style.display = 'none';
        });
      }
    } else {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleContactSubmit();
      });
    }

    // Attach file input listener for immediate file validation
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        validateAttachedFile(fileInput);
      });
    }
  }

  function validateAttachedFile(input) {
    if (!input.files || input.files.length === 0) return true;
    const file = input.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (file.size > maxSize) {
      ui.showToast('Attached file exceeds the 5MB size limit.', 'error');
      input.value = '';
      return false;
    }

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      ui.showToast('Invalid file format. Please upload a JPG, PNG, or PDF.', 'error');
      input.value = '';
      return false;
    }

    ui.showToast(`Attached: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`, 'info');
    return true;
  }

  function handleContactSubmit() {
    clearContactErrors();

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const subjectSelect = document.getElementById('subject');
    const messageInput = document.getElementById('Message');
    const policyCheckbox = document.getElementById('Policy');
    const fileInput = document.querySelector('input[type="file"]');

    let isValid = true;

    // 1. Name validation
    if (!nameInput || nameInput.value.trim().length < 2) {
      showFieldError(nameInput, 'Please enter your full name (at least 2 characters).');
      isValid = false;
    }

    // 2. Email validation
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      showFieldError(emailInput, 'Please provide a valid email address.');
      isValid = false;
    }

    // 3. Mobile validation (Optional, but if given must be 10 digits)
    if (phoneInput && phoneInput.value.trim()) {
      const cleanPhone = phoneInput.value.trim().replace(/\s+/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        showFieldError(phoneInput, 'Mobile number must be a valid 10-digit Indian number.');
        isValid = false;
      }
    }

    // 4. Subject validation
    if (
      !subjectSelect ||
      !subjectSelect.value ||
      subjectSelect.value.startsWith('--') ||
      subjectSelect.selectedIndex === 0
    ) {
      showFieldError(subjectSelect, 'Please select a topic for your message.');
      isValid = false;
    }

    // 5. Message validation
    if (!messageInput || messageInput.value.trim().length < 10) {
      showFieldError(messageInput, 'Please enter your message (at least 10 characters).');
      isValid = false;
    }

    // 6. Policy consent checkbox
    if (!policyCheckbox || !policyCheckbox.checked) {
      showFieldError(
        policyCheckbox,
        'You must agree to the Privacy Policy to submit your enquiry.'
      );
      isValid = false;
    }

    // 7. File validation
    if (fileInput && !validateAttachedFile(fileInput)) {
      isValid = false;
    }

    if (!isValid) {
      ui.showToast('Please fix the highlighted form errors.', 'error');
      return;
    }

    // Construct submission payload
    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput ? phoneInput.value.trim() : '',
      subject: subjectSelect.value,
      message: messageInput.value.trim(),
      policyAgreed: true,
      hasAttachment: fileInput && fileInput.files && fileInput.files.length > 0,
      submittedAt: new Date().toISOString()
    };

    console.log('[ThreadCo Contact Integration] Submission payload:', payload);
    // Integration endpoint: POST /api/contact

    // Show inline success message
    let feedback = document.getElementById('tc-contact-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.id = 'tc-contact-feedback';
      feedback.className = 'tc-form-feedback tc-success-box';
      const msgSection = document.getElementById('message');
      if (msgSection) msgSection.insertBefore(feedback, msgSection.firstChild.nextSibling);
    }

    feedback.style.display = 'block';
    feedback.innerHTML = `
      <div class="tc-feedback-inner">
        <h4>✓ Message Received, ${escapeHtml(payload.name)}!</h4>
        <p>Your enquiry regarding <strong>"${escapeHtml(payload.subject)}"</strong> has been submitted. Our Delhi team will respond to <strong>${escapeHtml(payload.email)}</strong> within 24 hours.</p>
        <small class="tc-demo-note">* Demo Mode: Real email delivery requires connecting POST /api/contact endpoint.</small>
      </div>
    `;

    ui.showToast('Your message has been sent successfully!', 'success');

    // Reset inputs
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (subjectSelect) subjectSelect.selectedIndex = 0;
    if (messageInput) messageInput.value = '';
    if (policyCheckbox) policyCheckbox.checked = false;
    if (fileInput) fileInput.value = '';
  }

  function showFieldError(element, msg) {
    if (!element) return;
    element.classList.add('tc-input-error');

    let errSpan = element.parentNode.querySelector('.tc-inline-error');
    if (!errSpan) {
      errSpan = document.createElement('span');
      errSpan.className = 'tc-inline-error';
      element.parentNode.insertBefore(errSpan, element.nextSibling);
    }
    errSpan.textContent = msg;
    errSpan.style.display = 'block';
  }

  function clearContactErrors() {
    document.querySelectorAll('.tc-input-error').forEach((el) => el.classList.remove('tc-input-error'));
    document.querySelectorAll('.tc-inline-error').forEach((el) => { el.style.display = 'none'; });
  }

  /* ==========================================================================
     2. NEWSLETTER FORMS
     ========================================================================== */
  function initNewsletterForms() {
    const notifySection = document.getElementById('notify');
    if (!notifySection) return;

    const form = notifySection.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      if (!emailInput) return;

      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ui.showToast('Please enter a valid email address.', 'error');
        return;
      }

      console.log('[ThreadCo Newsletter Integration] Subscribing email:', email);
      // Integration endpoint: POST /api/newsletter

      form.innerHTML = `
        <div class="tc-newsletter-success">
          <span>✓</span> You're on the early access list! Check your inbox this Friday at 12:00 PM.
        </div>
      `;

      ui.showToast("You've been subscribed to early drop access!", 'success');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    initForms,
    initContactForm,
    initNewsletterForms
  };
});

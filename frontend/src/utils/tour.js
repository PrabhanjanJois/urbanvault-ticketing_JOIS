import { driver } from 'driver.js'
import '../styles/driver-theme.css'

/**
 * Start the interactive product tour.
 * @param {Object} options
 * @param {boolean} options.isDark - True if dark mode is active
 * @param {Function} [options.onSelectFirstTicket] - Callback to auto-select a ticket if none is active
 */
export function startProductTour({ isDark = false, onSelectFirstTicket } = {}) {
  // If a ticket isn't already selected, trigger selection so the detail pane is mounted
  if (typeof onSelectFirstTicket === 'function') {
    onSelectFirstTicket()
  }

  // Small delay to allow DOM render if a ticket was just selected
  setTimeout(() => {
    const popoverThemeClass = isDark ? 'driver-popover-dark' : 'driver-popover-light'

    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: isDark ? 0.75 : 0.6,
      stagePadding: 6,
      stageRadius: 10,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Finish Tour ✓',
      closeBtnLabel: 'Skip Tour',
      popoverClass: popoverThemeClass,
      onPopoverRender: (popover, { driver: d }) => {
        // Inject a dedicated "Skip Tour" button in the popover footer
        if (popover?.footer && !popover.footer.querySelector('.driver-skip-tour-btn')) {
          const skipBtn = document.createElement('button')
          skipBtn.className = 'driver-skip-tour-btn'
          skipBtn.type = 'button'
          skipBtn.innerText = 'Skip Tour'
          skipBtn.onclick = (e) => {
            e.preventDefault()
            d.destroy()
          }

          if (popover.footerButtons) {
            popover.footer.insertBefore(skipBtn, popover.footerButtons)
          } else {
            popover.footer.appendChild(skipBtn)
          }
        }
      },
      steps: [
        {
          element: '#tour-persona-switcher',
          popover: {
            title: '1-Click Persona Switcher',
            description:
              'Seamlessly switch between <strong>5 seeded personas</strong> to test every angle of the workflow without passwords:<br/>' +
              '• <strong>Client POC (Chaitanya M)</strong>: Tenant raising requests.<br/>' +
              '• <strong>Facility Manager (Chandan S)</strong>: Property-wide oversight (no CTA).<br/>' +
              '• <strong>Department Managers (Dhananjaya / Abdul)</strong>: Triage & assign trade workers.<br/>' +
              '• <strong>Technicians (Prakash / Suresh)</strong>: Field repairs & assessments.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-nav-btn',
          popover: {
            title: 'Product Tour Shortcut',
            description:
              'You can launch this guided walkthrough at any time by clicking this button. You can also press <strong>Esc</strong> or click <strong>Skip Tour</strong> whenever you want to exit.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-create-ticket-btn',
          popover: {
            title: 'Create Ticket & Photo Upload',
            description:
              'Submit tickets with rich details:<br/>' +
              '• <strong>Tenant & Multi-Floor</strong> selection.<br/>' +
              '• <strong>Unique Asset Identifier</strong> (for AC unit, monitor, electrical board, etc.).<br/>' +
              '• <strong>Image Attachment Dropzone</strong> with drag-and-drop & live preview.<br/>' +
              '<em>Note: Field technicians are disallowed from creating tickets.</em>',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-queue-tabs',
          popover: {
            title: 'Live Ticket Queues',
            description:
              'Switch between <strong>Open Tickets</strong> and <strong>Closed Tickets</strong> with real-time count badges synchronized to your role and permissions.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-search-filters',
          popover: {
            title: 'Instant Search & Multi-Filters',
            description:
              'Search tickets by keyword or ID (e.g. <strong>#TKT-1058</strong>), and filter across Client, Service Department, Lifecycle Status, or Newest/Oldest order.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-ticket-list',
          popover: {
            title: 'Master Ticket Queue',
            description:
              'View ticket numbers, priority chips, SLA countdown timers, assigned department leads, and unread comment badges. Click any ticket card to inspect its details on the right.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-ticket-detail',
          popover: {
            title: 'Split-Screen Ticket Workspace',
            description:
              'Examine complete ticket metadata including tenant name, affected floor(s), unique asset number, reporter identity, and live SLA deadlines.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '#tour-action-banner',
          popover: {
            title: 'Dynamic Role-Aware Action Banners',
            description:
              'The action banner dynamically updates based on the logged-in role:<br/>' +
              '• <strong>Department POC</strong>: Has yellow <strong>Action Required</strong> with <em>Assign Worker</em> & <em>Change Department</em>.<br/>' +
              '• <strong>Technician</strong>: Has blue <strong>Submit Assessment</strong> with completion photo upload.<br/>' +
              '• <strong>Facility Manager</strong>: Property monitoring banner (no CTA).',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-issue-description',
          popover: {
            title: 'Issue Description & Photo Lightbox',
            description:
              'Review the issue details and before-photos uploaded during ticket creation. <strong>Click any image</strong> anywhere in the system to open the full-resolution Lightbox viewer!',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-comments-box',
          popover: {
            title: 'Real-Time Comments & Photo Evidence',
            description:
              'Collaborate directly between tenant clients, facility managers, and field technicians. Click the camera icon to upload repair photos, receipts, or inspection updates directly into comments!',
            side: 'top',
            align: 'start',
          },
        },
      ],
    })

    driverObj.drive()
  }, 100)
}

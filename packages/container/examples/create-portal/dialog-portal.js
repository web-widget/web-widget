let dialog, dialogWidget;
export default () => {
  // Single instance
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialogWidget = document.createElement('web-widget');

    document.body.appendChild(dialog);
    dialog.appendChild(dialogWidget);

    dialogWidget.name = 'dialog';
    dialogWidget.application = () => ({
      async bootstrap({ container, context }) {
        const dialogMain = document.createElement('slot');
        const dialogCloseButton = document.createElement('button');

        dialogCloseButton.innerText = 'close';
        dialogCloseButton.onclick = () => context.unmount();

        container.appendChild(dialogCloseButton);
        container.appendChild(dialogMain);
        dialog.addEventListener('close', () => {
          context.unmount();
        });
      },
      async mount() {
        dialog.showModal();
      },
      async unmount() {
        dialog.close();
      }
    });
  }

  return dialogWidget;
};

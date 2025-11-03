export default function Privacy() {
  return (
    <div className="flex flex-col m-3 max-w-[1200px] h-full">
      <h1>Privacy Policy</h1>
      <p className="mt-5">Last updated: November 2025</p>
      <p>
        SubsData respects your privacy. This app uses your Google account to
        access, display, manage, and calculate your subscription data and to
        store this data securely in your own Google Drive.
      </p>
      <p>
        We do not collect, store, or share your personal information on any
        external servers. All data remains under your Google account control.
      </p>
      <p>
        Access is granted via Google OAuth for the scope{" "}
        <code className="text-sm">
          https://www.googleapis.com/auth/drive.file
        </code>
        , which limits access only to files created by SubsData.
      </p>
      <p>
        If you revoke access from your Google account settings, SubsData will no
        longer have permission to view or modify your files.
      </p>
      <p>
        For any questions, please contact us at:{" "}
        <a href="flex mailto:gemdtera@gmail.com">gemdtera@gmail.com</a>
      </p>
      <p className="mt-[20px]">
        **Data usage:** We get access to your subscription data exclusively for
        their display and management in the application. We don't we do not use
        this data for any other purpose.
      </p>
      <p>
        **Email sending function:** The application provides an optional feature
        that allows you to send a copy of your data. email subscriptions. This
        function is a **action, initiated by the user**, and uses your Google
        account **only to send the data to your own authorized email address
        email address** (the same address that was used to log in). We don't
        read, We do not store or use access to your mail for any other purposes.
        goals, except for this one-time action on your command.
      </p>
    </div>
  );
}

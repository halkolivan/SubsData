export default function Privacy() {
  return (
    <div className="flex max-w-[800px] p-[20px] my-20 mx-auto">
      <h1>Privacy Policy</h1>
      <p>Last updated: October 2025</p>
      <p>
        SubsData respects your privacy. This app uses your Google account only
        to access and store your subscription data in your own Google Drive.
      </p>
      <p>
        We do not collect, store, or share your personal information on any
        external servers. All data remains under your Google account control.
      </p>
      <p>
        Access is granted via Google OAuth for the scope{" "}
        <code>https://www.googleapis.com/auth/drive.file</code>, which limits
        access only to files created by SubsData.
      </p>
      <p>
        If you revoke access from your Google account settings, SubsData will no
        longer have permission to view or modify your files.
      </p>
      <p>
        For any questions, please contact us at:{" "}
        <a href="flex mailto:gemdtera@gmail.com">gemdtera@gmail.com</a>
      </p>
    </div>
  );
}

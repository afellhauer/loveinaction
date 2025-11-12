import "./TermsDialog.css"; 

export default function TermsDialog({ onClose }) {
  return (
    <div className="terms">
      <div className="terms-dialog">
        <button className="terms-close" onClick={onClose}>×</button>
        <h2 className="terms-title">Terms & Conditions</h2>
        <div>
          <p>
            By using this app, you agree to abide by all community guidelines, respect other users, and use the platform responsibly. 
            You must be at least 18 years to use this app. 
            Any form of harassment or discrimination is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
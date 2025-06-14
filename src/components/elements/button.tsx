interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button
      type="button"
      className="text-2xl btn bg-blue-950 hover:bg-primary"
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;

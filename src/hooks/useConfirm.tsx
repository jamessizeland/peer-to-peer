import React, { useState, useCallback } from "react";
import Modal from "../components/elements/modal"; // Adjust path if necessary
import { GrCheckmark, GrClose } from "react-icons/gr";

interface ConfirmationOptions {
  /** The question to display to the user. */
  question: string;
  /** Optional title for the confirmation modal. Defaults to "Confirmation". */
  title?: string;
  /** Optional text for the confirmation button. Defaults to "Yes". */
  yesText?: string;
  /** Optional text for the cancellation button. Defaults to "No". */
  noText?: string;
  /** Optionally invert the yes no colours if asking an inverted question. */
  invertColors?: boolean;
}

type ConfirmFunction = (options: ConfirmationOptions) => Promise<boolean>;

interface UseConfirmReturn {
  /** Function to trigger the confirmation dialog. Returns a promise that resolves with the user's choice. */
  confirm: ConfirmFunction;
  /** The Modal component to be rendered in your component tree. */
  ConfirmationModal: React.FC;
}

/**
 * Custom hook to display a confirmation modal and await user's choice.
 * @returns An object containing the `confirm` function and the `ConfirmationModal` component.
 */
export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationOptions, setConfirmationOptions] =
    useState<ConfirmationOptions | null>(null);
  // Stores the resolve function of the promise returned by `confirm`
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = useCallback(
    (options: ConfirmationOptions): Promise<boolean> => {
      setConfirmationOptions(options);
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const handleResolve = useCallback(
    (value: boolean) => {
      if (resolvePromise) resolvePromise(value);
      setIsOpen(false);
      setConfirmationOptions(null); // Clear options after resolving
      setResolvePromise(null); // Clear resolver after resolving
    },
    [resolvePromise]
  );

  const ConfirmationModal: React.FC = useCallback(() => {
    if (!isOpen || !confirmationOptions) return null;

    const {
      question,
      title = "Confirmation",
      yesText = "Yes",
      noText = "No",
      invertColors = false,
    } = confirmationOptions;

    const modalActions = (
      <>
        <button
          className={`btn ${
            invertColors
              ? "btn-error"
              : "btn-primary bg-blue-950 hover:bg-primary"
          }`}
          onClick={() => handleResolve(true)}
        >
          {yesText} <GrCheckmark className="ml-1" />
        </button>
        <button
          className={`btn ${
            invertColors
              ? "btn-primary bg-blue-950 hover:bg-primary"
              : "btn-error"
          }`}
          onClick={() => handleResolve(false)}
        >
          {noText} <GrClose className="ml-1" />
        </button>
      </>
    );

    return (
      <Modal
        isOpen={isOpen}
        onClose={() => handleResolve(false)} // Handles Esc/backdrop click if useModal supports it
        title={title}
        actions={modalActions} // Pass custom actions to the Modal
      >
        <div className="py-4 text-center">{question}</div>
      </Modal>
    );
  }, [isOpen, confirmationOptions, handleResolve]);

  return { confirm, ConfirmationModal };
}

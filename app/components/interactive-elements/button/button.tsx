import classNames from "classnames";
import React, {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
} from "react";

import styles from "./button.module.css";

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: "primary" | "secondary";
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  rel?: string;
  download?: AnchorHTMLAttributes<HTMLAnchorElement>["download"];
};

const cx = classNames.bind(styles);

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className,
  href,
  target,
  rel,
  download,
  ...rest
}) => {
  const buttonClassName = cx(styles.button, styles[variant], className);

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        download={download}
        className={buttonClassName}
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <button {...rest} className={buttonClassName}>
      {children}
    </button>
  );
};

export default Button;

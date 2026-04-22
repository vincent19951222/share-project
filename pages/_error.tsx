import NextErrorComponent, { type ErrorProps } from "next/error";

function LegacyErrorPage(props: ErrorProps) {
  return <NextErrorComponent statusCode={props.statusCode} title={props.title} />;
}

LegacyErrorPage.getInitialProps = NextErrorComponent.getInitialProps;

export default LegacyErrorPage;

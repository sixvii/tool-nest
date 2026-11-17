export default function CopyButton({ copied, onClick }) {
  return <button onClick={onClick}>{copied ? 'Copied' : 'Copy'}</button>;
}

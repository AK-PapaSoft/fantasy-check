export default function SimplePage() {
  return (
    <div>
      <h1>Simple Test Page</h1>
      <p>If you can see this, the deployment is working!</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  )
}
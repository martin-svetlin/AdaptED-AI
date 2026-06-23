import Header from "../components/Header";
import FeatureCard from "../components/FeatureCard";

function StudentDashboard() {
  return (
  <>
  <Header />
    <div className="min-h-screen bg-slate-100 p-10">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          Cryptography
        </h1>

        <p className="text-gray-600 mb-10">
          Student Dashboard
        </p>

        <div className="grid md:grid-cols-2 gap-8">

          <FeatureCard title="Take Quiz" />

          <FeatureCard title="Progress" />

          <FeatureCard title="Leaderboard" />

        </div>

      </div>

    </div>
    </>
  );
}

export default StudentDashboard;
function FeatureCard({ icon, title, description, onClick }) {
  return (
    <div
      onClick={onClick}
      className="
        bg-white
        rounded-3xl
        shadow-md
        hover:shadow-xl
        hover:-translate-y-1
        transition-all
        duration-300
        cursor-pointer
        p-8
        min-h-[220px]
        flex
        flex-col
        justify-between
      "
    >

      <div className="text-5xl mb-4">
        {icon}
      </div>

      <div>

        <h3 className="text-2xl font-bold mb-3">
          {title}
        </h3>

        <p className="text-gray-500">
          {description}
        </p>

      </div>

    </div>
  );
}

export default FeatureCard;
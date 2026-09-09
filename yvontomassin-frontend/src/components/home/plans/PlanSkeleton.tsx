import Bone from "@/src/components/Shared/Bone";
import { MealCardSkeleton } from "@/src/components/Shared/skeletons";

export default function PlanSkeleton() {
  return (
    <section className="min-h-[70vh] bg-[#f5f4f0] py-2 md:py-10" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="mb-6 flex items-center justify-between">
          <Bone className="h-4 w-40" />
          <Bone className="h-4 w-24" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-6 sm:grid-cols-2">
            <MealCardSkeleton />
            <MealCardSkeleton />
            <MealCardSkeleton />
            <MealCardSkeleton />
          </div>

          <aside className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.25)]">
            <Bone className="h-5 w-40" />
            <Bone className="mt-2 h-3 w-28" />
            <div className="mt-4">
              <div className="flex justify-between">
                <Bone className="h-3 w-16" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="mt-2 h-2 w-full rounded-full" />
            </div>
            <div className="mt-5 space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item}>
                  <div className="flex justify-between">
                    <Bone className="h-3 w-20" />
                    <Bone className="h-3 w-16" />
                  </div>
                  <Bone className="mt-2 h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
            <Bone className="mt-5 h-9 w-full rounded-lg" />
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
              <Bone className="h-3 w-36" />
              <Bone className="mt-3 h-9 w-full rounded-lg bg-[#8F00FF]/20" />
              <Bone className="mt-3 h-9 w-full rounded-lg" />
              <Bone className="mt-2 h-9 w-full rounded-lg" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
